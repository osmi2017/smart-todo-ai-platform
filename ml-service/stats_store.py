"""
Stockage des statistiques alimentées par le bus d'événements Kafka.

Les fonctions ici sont volontairement pures (pas d'accès réseau Kafka) afin
d'être testables unitairement : le consommateur (kafka_consumer.py) se
contente de les appeler pour chaque événement reçu.

Les statistiques sont persistées dans un fichier JSON pour survivre à un
redémarrage du service (le compteur ne repart pas à zéro à chaque déploiement).
Pour un déploiement multi-instance, on migrerait ce stockage vers Redis ou une
base partagée, mais un seul consommateur de ce groupe tourne à la fois
(garantie Kafka par partition), donc un fichier local suffit ici.
"""
import json
import os
import threading
from datetime import datetime, timezone

STATS_FILE = os.getenv(
    'KAFKA_STATS_FILE',
    os.path.join(os.path.dirname(__file__), 'kafka_stats_state.json'),
)

_lock = threading.Lock()


def _default_stats():
    return {
        'total_tasks_completed': 0,
        'by_project': {},   # project_id (str) -> count
        'by_user': {},      # user_id (str) -> count
        'avg_actual_time_minutes': None,
        '_actual_time_sum': 0.0,
        '_actual_time_count': 0,
        'last_event_at': None,
        'last_updated_at': None,
        '_processed_event_ids': [],
    }


def load_stats(path=None):
    path = path or STATS_FILE
    if not os.path.exists(path):
        return _default_stats()
    try:
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        # Fusionne avec les défauts pour tolérer un schéma qui évolue.
        stats = _default_stats()
        stats.update(data)
        return stats
    except (json.JSONDecodeError, OSError):
        return _default_stats()


def save_stats(stats, path=None):
    path = path or STATS_FILE
    with _lock:
        parent = os.path.dirname(path)
        if parent:
            os.makedirs(parent, exist_ok=True)
        tmp_path = f'{path}.tmp'
        with open(tmp_path, 'w', encoding='utf-8') as f:
            json.dump(stats, f, indent=2)
        os.replace(tmp_path, path)  # écriture atomique : jamais de fichier tronqué


def update_stats_with_task_completed(stats, event):
    """Met à jour les statistiques à partir d'un événement 'task_completed'.

    Retourne un nouveau dict de stats (ne mute pas l'argument reçu), pour
    faciliter les tests et éviter les effets de bord surprenants.
    """
    event_id = event.get('id') or event.get('event_id')
    if not event_id:
        raise ValueError('Task completion event is missing its id')

    processed_event_ids = list(stats.get('_processed_event_ids', []))
    if event_id in processed_event_ids:
        return dict(stats)

    payload = event.get('data', event.get('payload', {}))
    updated = dict(stats)

    updated['total_tasks_completed'] = stats.get('total_tasks_completed', 0) + 1
    updated['_processed_event_ids'] = [*processed_event_ids, event_id]

    project_id = payload.get('project_id')
    if project_id is not None:
        by_project = dict(stats.get('by_project', {}))
        by_project[str(project_id)] = by_project.get(str(project_id), 0) + 1
        updated['by_project'] = by_project

    user_id = payload.get('assigned_to_id')
    if user_id is not None:
        by_user = dict(stats.get('by_user', {}))
        by_user[str(user_id)] = by_user.get(str(user_id), 0) + 1
        updated['by_user'] = by_user

    actual_time = payload.get('actual_time')
    if actual_time is not None:
        actual_sum = stats.get('_actual_time_sum', 0.0) + float(actual_time)
        actual_count = stats.get('_actual_time_count', 0) + 1
        updated['_actual_time_sum'] = actual_sum
        updated['_actual_time_count'] = actual_count
        updated['avg_actual_time_minutes'] = round(actual_sum / actual_count, 2)

    updated['last_event_at'] = event.get('time') or event.get('occurred_at')
    updated['last_updated_at'] = datetime.now(timezone.utc).isoformat()

    return updated
