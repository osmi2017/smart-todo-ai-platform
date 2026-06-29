import threading

_thread_local = threading.local()


def get_current_company():
    """Retrieve the current company from thread-local storage."""
    return getattr(_thread_local, 'company', None)


def get_current_user():
    """Retrieve the current user from thread-local storage."""
    return getattr(_thread_local, 'user', None)


class TenantMiddleware:
    """
    Middleware that stores the authenticated user's company in thread-local
    storage so that managers and querysets can filter by tenant automatically.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        _thread_local.company = None
        _thread_local.user = None

        if hasattr(request, 'user') and request.user.is_authenticated:
            _thread_local.company = request.user.company
            _thread_local.user = request.user

        response = self.get_response(request)

        _thread_local.company = None
        _thread_local.user = None

        return response
