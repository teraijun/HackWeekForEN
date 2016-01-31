from django.conf.urls import patterns, url, include
from django.conf import settings

urlpatterns = patterns(
    '',
    url(r"^$", "oauth.views.index", name="evernote_index"),
    url(r"^callback/$", "oauth.views.callback", name="evernote_callback"),
    url(r"^login/$", "oauth.views.login", name="evernote_login"),
    url(r"^logout/$", "oauth.views.logout", name="evernote_logout"),
    url(r"^info/$", "oauth.views.get_info", name="evernote_info"),
    url(r"^notebook/$", "oauth.views.get_notebook", name="evernote_notebook"),
    url(r"^word/$", "oauth.views.get_word", name="evernote_word"),
    url(r"^words/$", "oauth.views.get_words", name="evernote_words"),
    url(r"^year/$", "oauth.views.get_words_year", name="evernote_words_year"),
)