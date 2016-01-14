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
import os
import io
import StringIO
import re
import random
from bs4 import BeautifulSoup
import nltk
from nltk import word_tokenize, pos_tag
from nltk.corpus import stopwords
from nltk.text import Text
from nltk.book import *


sandbox = False

if sandbox:
    base_url = 'https://sandbox.evernote.com'
else:
    base_url = 'https://www.evernote.com'

link_to_en = base_url + '/Home.action'

# Search_Period = 'updated:month'
Search_Period = 'updated:day-30'

stop_words = [
    "a", "an", "and", "are", "as", "at", "be", "but", "by",
    "for", "if", "in", "into", "is", "it",
    "no", "not", "of", "on", "or", "such",
    "that", "the", "their", "then", "there", "these",
    "they", "this", "to", "was", "will", "with"
];


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

    user_id = user_info.id
    if user_info.accounting.businessId :
        is_evernote_business = True
    else :
        is_evernote_business = False

    if user_info.accounting.businessRole == 1:
        is_evernote_business_admin = True
    else :
        is_evernote_business_admin = False

    if is_evernote_business:
        business_user_id = user_info.accounting.businessId
        business = user_store.authenticateToBusiness(token=token)
        business_token = business.authenticationToken
        business_expiration = business.expiration
        business_shardId = business.user.shardId
    else:
        business_user_id = ''
        business_token = ''
        business_expiration = ''
        business_shardId = ''

    response = json_response_with_headers({
            'status': 'success',
            'csrf_token': get_token(request),
            'access_token': token,
            'redirect_url': '/logout/',
            'msg': 'Logout',
            'home_url': link_to_en,
            'user_id': user_id,
            'is_evernote_business': is_evernote_business,
            'is_evernote_business_admin': is_evernote_business_admin,
            'business_user_id': business_user_id,
            'business_token': business_token,
            'business_expiration': business_expiration,
            'business_shardId': business_shardId,
    })
    return response

def get_num_of_note(note_store, token, guid):
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
        # return random.randint(1, 10)

    except Errors.EDAMUserException, edue:
        print "EDAMUserException:", edue
        return 0

    except Errors.EDAMNotFoundException, ednfe:
        print "EDAMNotFoundException: Invalid parent notebook GUID"
        return 0

def get_notebook(request):
    try:
        token = request.POST['access_token']
        business_token = request.POST['business_token']
        client = get_evernote_client(token=token)
    except KeyError:
        return json_response_with_headers({
            'status': 'redirect',
            'redirect_url': '/login/',
            'home_url': link_to_en,
            'msg': 'Login to use'
        })    
    note_store = client.get_note_store()
    listNotebooks = note_store.listNotebooks()
    personal_notebook = []
    for listNotebook in listNotebooks:
        count = get_num_of_note(note_store, token, listNotebook.guid)
        personal_notebook.append({
            'guid': listNotebook.guid,
            'name': listNotebook.name,
            'count': count,
            'created': listNotebook.serviceCreated,
            'updated': listNotebook.serviceUpdated,
        })

    business_notebook = []
    if business_token:
        business_note_store = client.get_business_note_store()
        businessListNotebooks = business_note_store.listNotebooks(business_token)
        for listNotebook in businessListNotebooks:
            count = get_num_of_note(business_note_store, business_token, listNotebook.guid)
            business_notebook.append({
                'guid': listNotebook.guid,
                'name': listNotebook.name,
                'count': count,
                'created': listNotebook.serviceCreated,
                'updated': listNotebook.serviceUpdated,
            })

    notebook = {
        'personal': personal_notebook,
        'business': business_notebook
    }
    response = json_response_with_headers({
            'status': 'success',
            'access_token': token,
            'notebook': notebook,
            'business_token': business_token,
    })
    return response

def get_word(request):
    try:
        token = request.POST['access_token']
        business_token = request.POST['business_token']
        client = get_evernote_client(token=token)
    except KeyError:
        return json_response_with_headers({
            'status': 'redirect',
            'redirect_url': '/login/',
            'home_url': link_to_en,
            'msg': 'Login to use'
        })
    notes = {}
    # for personal
    personal_note_includes_num = get_note_common_words(client.get_note_store(), token)
    personal_note = []
    for note in personal_note_includes_num:
        personal_note.append(note[0])

    # for business
    business_note = []
    if business_token :
        business_note_includes_num = get_note_common_words(client.get_business_note_store(), business_token)
        for note in business_note_includes_num:
            business_note.append(note[0])

    words = {
        'personal': personal_note,
        'business': business_note
    }
    response = json_response_with_headers({
            'status': 'success',
            'access_token': token,
            'words': words
    })
    return response


def get_note_common_words(note_store, token):
    whole_content = ''
    note_filter = NoteStore.NoteFilter()
    note_filter.order = NoteSortOrder.UPDATED
    note_filter.words = Search_Period

    search_spec = NoteStore.NotesMetadataResultSpec()
    search_spec.includeAttributes = True;
    search_spec.includeCreated = True;
    search_spec.includeUpdated = True;
    search_spec.includeTitle = True;
    try :
        noteList = note_store.findNotesMetadata(token, note_filter, 0, 1, search_spec)
        for n in noteList.notes:
            content = note_store.getNoteContent(token, n.guid)
            soup = BeautifulSoup(content.decode('utf-8'), "html.parser")
            parsed_content = ''
            for tag in soup.find_all(re.compile('.*')):
                if tag.string is not None:
                    if len(parsed_content) == 0:
                        parsed_content = (tag.string)
                    else:
                        parsed_content += ' ' + (tag.string)
            whole_content += parsed_content + ' '

    except Errors.EDAMUserException, edue:
        print "EDAMUserException:", edue
    except Errors.EDAMNotFoundException, ednfe:
        print "EDAMNotFoundException: Invalid parent notebook GUID"

    most_common_words = []
    if len(whole_content) > 0:
        most_common_words = get_m_top_words(whole_content)

    return most_common_words


def get_words(request):
    try:
        token = request.POST['access_token']
        business_token = request.POST['business_token']
        client = get_evernote_client(token=token)
    except KeyError:
        return json_response_with_headers({
            'status': 'redirect',
            'redirect_url': '/login/',
            'home_url': link_to_en,
            'msg': 'Login to use'
        })
    notes = {}
    # for personal
    personal_note = get_notes_list(client.get_note_store(), token)

    # for business
    business_note = {}
    if business_token :
        business_note = get_notes_list(client.get_business_note_store(), business_token)

    notes = {
        'personal': personal_note,
        'business': business_note
    }
    response = json_response_with_headers({
            'status': 'success',
            'access_token': token,
            'note': notes
    })
    return response

def get_notes_list(note_store, token):
    notes = []
    whole_content = ''
    note_filter = NoteStore.NoteFilter()
    note_filter.order = NoteSortOrder.UPDATED
    note_filter.words = Search_Period

    search_spec = NoteStore.NotesMetadataResultSpec()
    search_spec.includeAttributes = True;
    search_spec.includeCreated = True;
    search_spec.includeUpdated = True;
    search_spec.includeTitle = True;
    try :
        noteList = note_store.findNotesMetadata(token, note_filter, 0, 100, search_spec)
        for n in noteList.notes:
            content = note_store.getNoteContent(token, n.guid)
            soup = BeautifulSoup(content.decode('utf-8'), "html.parser")
            parsed_content = ''
            for tag in soup.find_all(re.compile('.*')):
                if tag.string is not None:
                    if len(parsed_content) == 0:
                        parsed_content = (tag.string)
                    else:
                        parsed_content += ' ' + (tag.string)
            whole_content += parsed_content + ' '
            notes.append({
                "title": n.title,
                "note_id": n.guid,
                "updated": n.updated,
                "content": parsed_content,
            })

    except Errors.EDAMUserException, edue:
        print "EDAMUserException:", edue
    except Errors.EDAMNotFoundException, ednfe:
        print "EDAMNotFoundException: Invalid parent notebook GUID"

    most_common_words = []
    if len(whole_content) > 0:
        most_common_words = get_m_top_words(whole_content)
    
    most_common_words_obj = convertArrToObject(most_common_words)

    note = {
        'notes': notes,
        'most_common_words': most_common_words_obj
    }
    return note

def get_m_top_words(input):
    stop_words = set(stopwords.words('english'))
    tokens = nltk.word_tokenize(input)
    tagged = nltk.pos_tag(tokens)
    nouns = [item[0] for item in tagged if item[1][0] == 'N' if item[0] not in stop_words]
    fdist1 = FreqDist(nouns) 
    top_words = fdist1.most_common(100) 
    
    return top_words

def convertArrToObject(arr):
    newArr = []
    for word in arr:
        newArr.append({
            "name": word[0], "size": word[1]
        })
    obj = {
         "name": "flare",
         "children": newArr
    }
    return obj


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


