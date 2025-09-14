from .base import *

# Override database for local development
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# Disable database checks for development
MIGRATION_MODULES = {
    'users': None,
    'courses': None,
    'classrooms': None,
    'timetables': None,
    'approvals': None,
    'preferences': None,
    'reports': None,
}

DEBUG = True