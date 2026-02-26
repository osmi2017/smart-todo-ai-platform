# Crée le fichier wsgi.py s'il n'existe pas
cat > core/wsgi.py << 'EOF'
"""
WSGI config for core project.
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

application = get_wsgi_application()
EOF
