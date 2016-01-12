# -*- coding: utf-8 -*-
from evernote.api.client import EvernoteClient
from evernote.api.client import Store
from evernote.edam.type.ttypes import (
    Note
)
from evernote.edam.type.ttypes import NoteSortOrder
import evernote.edam.type.ttypes as Types
import evernote.edam.error.ttypes as Errors
import evernote.edam.notestore.NoteStore as NoteStore

from django.core.urlresolvers import reverse
from django.shortcuts import render_to_response
from django.shortcuts import redirect
from django.http import HttpResponse
from django.middleware.csrf import get_token
from django.conf import settings
from django.core import serializers
import json
import Cookie
import os
import socket
import oauth2 as oauth
import urllib
import urlparse
import hashlib
import binascii
import io
import StringIO
import re
import base64
from datetime import date
# import pycurl

sandbox = False

if sandbox:
    base_url = 'https://sandbox.evernote.com'
else:
    base_url = 'https://www.evernote.com'

link_to_en = base_url + '/Home.action'

def get_evernote_client(token=None):
    if token:
        return EvernoteClient(token=token, sandbox=sandbox)
    else:
        return EvernoteClient(
            consumer_key=settings.EN_CONSUMER_KEY,
            consumer_secret=settings.EN_CONSUMER_SECRET,
            sandbox=sandbox
        )

def index(request):
    csrf_token = get_token(request)
    response = render_to_response('index.html')
    return response

def callback(request):
    client = get_evernote_client()
    access_token = ''
    if 'oauth_verifier' in request.GET:
        oauth_verifier = request.GET.get("oauth_verifier")
        access_token = client.get_access_token(
            request.COOKIES['oauth_token'],
            request.COOKIES['oauth_token_secret'],
            oauth_verifier
        )

    try:
        callbackUrl = request.COOKIES['_redirect_url']
    except Exception as e :
        callbackUrl = 'http://%s/' % (request.get_host())
    print callbackUrl
    response = redirect(callbackUrl)
    if len(access_token) > 0 :
        response.set_cookie('access_token', access_token)
    response.delete_cookie('_redirect_url')
    return response

def login(request):
    if 'callback' in request.GET:
        redirectUrl = request.GET.get('callback').decode("utf-8")
    else :
        redirectUrl = 'http://www.nikkei.com/'
    callbackUrl = 'http://%s/' % (request.get_host())
    callbackUrl += 'callback/'
    client = get_evernote_client()
    request_token = client.get_request_token(callbackUrl)
    print request_token
    response = redirect(client.get_authorize_url(request_token))
    response.set_cookie('_redirect_url', redirectUrl)
    response.set_cookie('oauth_token', request_token['oauth_token'])
    response.set_cookie('oauth_token_secret', request_token['oauth_token_secret'])
    return response

def get_info(request):
    try:
        token = request.COOKIES['access_token']
        client = get_evernote_client(token=token)
    except KeyError:
        return json_response_with_headers({
            'status': 'redirect',
            'redirect_url': '/login/',
            'home_url': link_to_en,
            'msg': 'Login to use'
        })
    user_store = client.get_user_store()
    user_info = user_store.getUser()

    note_store = client.get_note_store()
    listNotebooks = note_store.listNotebooks()
    notebooks = []
    for listNotebook in listNotebooks:
        count = get_num_of_note(client, token, listNotebook.guid)
        notebooks.append({
            'guid': listNotebook.guid,
            'name': listNotebook.name,
            'count': count,
            'created': listNotebook.serviceCreated,
            'updated': listNotebook.serviceUpdated,
        })

    response = json_response_with_headers({
            'status': 'success',
            'access_token': token,
            'redirect_url': '/logout/',
            'msg': 'Logout',
            'notebooks': notebooks,
            'home_url': link_to_en,
            'username': user_info.username
    })
    return response


def import_note_content(request):
    try :
        token = request.COOKIES['access_token']
        note_id = request.POST['note_id']
    except Exception as e:
        return redirect('/login/')
    url = base_url + '/note/' + note_id
    # c = pycurl.Curl()
    # c.setopt(c.URL, url)
    # c.setopt(c.COOKIE, 'auth='+token)
    # c.setopt(c.VERBOSE, 1)
    # buf = StringIO.StringIO()
    # c.setopt(c.WRITEFUNCTION, buf.write)
    # c.perform()
    # content = buf.getvalue()
    # c.close()


    return json_response_with_headers({
        'status': 'success',
        'msg': 'content',
        'note_id': note_id,
        'content': content,
        # 'resources': resources
    })


def get_num_of_note(client, token, guid):
    note_store = client.get_note_store()
    note_filter = NoteStore.NoteFilter()
    note_filter.notebookGuid = guid
    note_filter.order = NoteSortOrder.UPDATED

    search_spec = NoteStore.NotesMetadataResultSpec()
    search_spec.includeAttributes = True;
    search_spec.includeCreated = True;
    search_spec.includeUpdated = True;
    search_spec.includeTitle = True;

    notes = []
    try :
        noteList = note_store.findNotesMetadata(token, note_filter, 0, 100, search_spec)
        return len(noteList.notes)

    except Errors.EDAMUserException, edue:
        print "EDAMUserException:", edue
        return 0

    except Errors.EDAMNotFoundException, ednfe:
        print "EDAMNotFoundException: Invalid parent notebook GUID"
        return 0

def import_note(request):
    try :
        token = request.COOKIES['access_token']
        guid = request.COOKIES['guid']
    except Exception as e:
        return redirect('/login/')
    client = get_evernote_client(token=token)
    note_store = client.get_note_store()
    note_filter = NoteStore.NoteFilter()
    note_filter.notebookGuid = guid
    note_filter.order = NoteSortOrder.UPDATED

    search_spec = NoteStore.NotesMetadataResultSpec()
    search_spec.includeAttributes = True;
    search_spec.includeCreated = True;
    search_spec.includeUpdated = True;
    search_spec.includeTitle = True;

    notes = []
    try :
        noteList = note_store.findNotesMetadata(token, note_filter, 0, 10, search_spec)
        for n in noteList.notes:
            notes.append({
                "title": n.title,
                "note_id": n.guid,
                "updated": n.updated
            })

    except Errors.EDAMUserException, edue:
        print "EDAMUserException:", edue
        return json_response_with_headers({
            'status': 'error',
            'msg': 'user permission error',
        })
    except Errors.EDAMNotFoundException, ednfe:
        print "EDAMNotFoundException: Invalid parent notebook GUID"
        return json_response_with_headers({
            'status': 'error',
            'msg': 'no find note',
        })
    return json_response_with_headers({
        'status': 'success',
        'msg': 'notes',
        'notes': notes,
    })


def json_response_with_headers(data, status=200):
    response_data = data
    return HttpResponse(json.dumps(response_data), content_type="application/json")

def logout(request):
    if 'callback' in request.GET:
        url = request.GET.get('callback').decode("utf-8")
        response = redirect(url)
        response.delete_cookie('id')
        response.delete_cookie('access_token')
        response.delete_cookie('oauth_token')
        response.delete_cookie('oauth_token_secret')
        response.delete_cookie('guid')
        return response

def is_localhost():
    return 'HTTP_HOST' not in os.environ or os.environ['HTTP_HOST'].startswith("localhost")

def reset(request):
    return redirect('/')


