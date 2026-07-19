FROM python:3.9-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# collectstatic n'a besoin d'aucun secret réel, seulement que Django puisse
# charger settings.py. Aucune variable d'environnement n'est disponible au
# moment du `docker build` (env_file/environment ne s'appliquent qu'au
# démarrage du conteneur) : DEBUG=True ici contourne uniquement la
# vérification de SECRET_KEY pour cette étape de build, et sera écrasé par
# la vraie valeur de .env au démarrage du conteneur (docker-compose).
ENV DEBUG=True
RUN python manage.py collectstatic --noinput

EXPOSE 8000

CMD ["gunicorn", "--bind", "0.0.0.0:8000", "core.wsgi:application"]
