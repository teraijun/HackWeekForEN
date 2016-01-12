from django.conf.urls import patterns, url, include
from django.conf import settings

urlpatterns = patterns(
    '',
    url(r'^static/(?P<path>.*)$', 'django.views.static.serve', {'document_root': settings.STATIC_ROOT, 'show_indexes':True}),
    url(r"^$", "oauth.views.index", name="evernote_index"),
    url(r"^callback/$", "oauth.views.callback", name="evernote_callback"),
    url(r"^login/$", "oauth.views.login", name="evernote_login"),
    url(r"^logout/$", "oauth.views.logout", name="evernote_logout"),
    url(r"^info/$", "oauth.views.get_info", name="evernote_info"),
    url(r"^import/$", "oauth.views.import_note", name="evernote_import"),
    url(r"^content/$", "oauth.views.import_note_content", name="evernote_import_content"),
    url(r"^reset/$", "oauth.views.reset", name="evernote_auth_reset"),
)
