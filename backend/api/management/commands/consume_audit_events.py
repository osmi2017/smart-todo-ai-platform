from django.core.management import call_command
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Compatibility alias for the centralized audit consumer.'

    def add_arguments(self, parser):
        parser.add_argument('--max-messages', type=int, default=0)

    def handle(self, *args, **options):
        call_command(
            'consume_events',
            'audit',
            max_messages=options['max_messages'],
        )
