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
import gettrends06


sandbox = False

if sandbox:
    base_url = 'https://sandbox.evernote.com'
else:
    base_url = 'https://www.evernote.com'

link_to_en = base_url + '/Home.action'

# Search_Period = 'updated:month'
Search_Period = 'updated:day-30'

search_for_year_query = [
    'created:month',
    'created:month-1 -created:month',
    'created:month-2 -created:month-1',
    'created:month-3 -created:month-2',
    'created:month-4 -created:month-3',
    'created:month-5 -created:month-4',
    'created:month-6 -created:month-5',
    'created:month-7 -created:month-6',
    'created:month-8 -created:month-7',
    'created:month-9 -created:month-8',
    'created:month-10 -created:month-9',
    'created:month-11 -created:month-10',
]


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

    if user_info.accounting.businessId :
        is_evernote_business = True
    else :
        is_evernote_business = False

    if is_evernote_business:
        business = user_store.authenticateToBusiness(token=token)
        business_token = business.authenticationToken
    else:
        business_token = ''

    response = json_response_with_headers({
            'status': 'success',
            'csrf_token': get_token(request),
            'access_token': token,
            'redirect_url': '/logout/',
            'msg': 'Logout',
            'home_url': link_to_en,
            'is_evernote_business': is_evernote_business,
            'business_token': business_token,
    })
    return response

# count of each notebook whole year
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
    note_filter = NoteStore.NoteFilter()
    note_filter.order = NoteSortOrder.UPDATED

    personal_note_count = []
    personal_note_counts = note_store.findNoteCounts(token, note_filter, False)
    for notebook in personal_note_counts.notebookCounts:
        obj = {}
        for month in search_for_year_query:
            count = get_month_note_count(note_store, token, notebook, month)
            obj[month] = count

        name = note_store.getNotebook(token, notebook).name
        obj['id'] = notebook
        obj['name'] = name
        obj['industry'] = 'Trading'
        obj['count'] = personal_note_counts.notebookCounts[notebook]
        personal_note_count.append(obj)

    personal_note = {
        'name': 'rank',
        'children': personal_note_count
    }

    business_note_count = []
    if business_token:
        business_note_store = client.get_business_note_store()
        business_note_counts = business_note_store.findNoteCounts(business_token, note_filter, False)
        for notebook in business_note_counts.notebookCounts:
            obj = {}
            for month in search_for_year_query:
                count = get_month_note_count(business_note_store, business_token, notebook, month)
                obj[month] = count

            name = business_note_store.getNotebook(business_token, notebook).name
            obj['id'] = notebook
            obj['name'] = name
            obj['industry'] = 'Notebook'
            obj['count'] = business_note_counts.notebookCounts[notebook]
            business_note_count.append(obj)

    business_note = {
        'name': 'rank',
        'children': business_note_count        
    }

    note_count = {
        'personal': personal_note,
        'business': business_note
    }
    
    response = json_response_with_headers({
        'notebook': note_count
    })
    
    return response

def get_words_year(request):
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
    trend_words = {}

    # for personal
    personal_trends = {}
    personal_whole_content_each_month = []
    note_store = client.get_note_store()
    note_filter = NoteStore.NoteFilter()
    note_filter.order = NoteSortOrder.UPDATED
    search_spec = NoteStore.NotesMetadataResultSpec()
    search_spec.includeAttributes = True;
    search_spec.includeCreated = True;
    search_spec.includeUpdated = True;
    search_spec.includeTitle = True;

    for month in search_for_year_query:
        whole_content = ''
        note_filter.words = month
        try :
            noteList = note_store.findNotesMetadata(token, note_filter, 0, 100, search_spec)
            for n in noteList.notes:
                whole_content += getWholeContentOfNote(note_store, token, n.guid) + ' '
        except Errors.EDAMUserException, edue:
            print "EDAMUserException:", edue
        except Errors.EDAMNotFoundException, ednfe:
            print "EDAMNotFoundException: Invalid parent notebook GUID"

        personal_whole_content_each_month.append(whole_content)

    # personal_trends = gettrends06.gettrends(personal_whole_content_each_month)
    personal_trends = personal_whole_content_each_month

    # for business
    business_trends = {}
    if business_token :
        business_whole_content_each_month = []
        note_store = client.get_note_store()
        business_note_store = client.get_business_note_store()
        note_filter = NoteStore.NoteFilter()
        note_filter.order = NoteSortOrder.UPDATED
        search_spec = NoteStore.NotesMetadataResultSpec()
        search_spec.includeAttributes = True;
        search_spec.includeCreated = True;
        search_spec.includeUpdated = True;
        search_spec.includeTitle = True;

        for month in search_for_year_query:
            whole_content = ''
            note_filter.words = month
            try :
                noteList = business_note_store.findNotesMetadata(business_token, note_filter, 0, 100, search_spec)
                for n in noteList.notes:
                    whole_content += getWholeContentOfNote(business_note_store, business_token, n.guid) + ' '
            except Errors.EDAMUserException, edue:
                print "EDAMUserException:", edue
            except Errors.EDAMNotFoundException, ednfe:
                print "EDAMNotFoundException: Invalid parent notebook GUID"

            business_whole_content_each_month.append(whole_content)
        # print business_whole_content_each_month[0]
        business_trends = gettrends06.gettrends(business_whole_content_each_month)
        # business_trends = business_whole_content_each_month

    trend_words = {
        'personal': personal_trends,
        'business': business_trends
    }
    response = json_response_with_headers({
            'status': 'success',
            'access_token': token,
            'trend_words': trend_words
    })

    return response


def get_month_note_count(note_store, token, guid, month):
    note_filter = NoteStore.NoteFilter()
    note_filter.order = NoteSortOrder.UPDATED
    note_filter.words = month
    note_filter.notebookGuid = guid

    search_spec = NoteStore.NotesMetadataResultSpec()
    search_spec.includeAttributes = True
    search_spec.includeCreated = True
    search_spec.includeUpdated = True
    search_spec.includeTitle = True
    count = 0
    try :
        noteList = note_store.findNotesMetadata(token, note_filter, 0, 100, search_spec)
        count = len(noteList.notes)
    except Errors.EDAMUserException, edue:
        print "EDAMUserException:", edue
    except Errors.EDAMNotFoundException, ednfe:
        print "EDAMNotFoundException: Invalid parent notebook GUID"

    return count

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
            whole_content += getWholeContentOfNote(note_store, token, n.guid) + ' '

    except Errors.EDAMUserException, edue:
        print "EDAMUserException:", edue
    except Errors.EDAMNotFoundException, ednfe:
        print "EDAMNotFoundException: Invalid parent notebook GUID"

    most_common_words = []
    if len(whole_content) > 0:
        most_common_words = get_m_top_words(whole_content)

    return most_common_words

def getWholeContentOfNote(note_store, token, guid):
    content = note_store.getNoteContent(token, guid)
    soup = BeautifulSoup(content.decode('utf-8'), "html.parser")
    parsed_content = ''
    for tag in soup.find_all(re.compile('.*')):
        if tag.string is not None:
            if len(parsed_content) == 0:
                parsed_content = (tag.string)
            else:
                parsed_content += ' ' + (tag.string)
    parsed_content += parsed_content + ' '
    return parsed_content

# bubble Chart
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
    personal_note = get_notes_list(client.get_note_store(), token, Search_Period)

    # for business
    business_note = {}
    if business_token :
        business_note = get_notes_list(client.get_business_note_store(), business_token, Search_Period)

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

def get_notes_list(note_store, token, query):
    notes = []
    whole_content = ''
    note_filter = NoteStore.NoteFilter()
    note_filter.order = NoteSortOrder.UPDATED
    note_filter.words = query

    search_spec = NoteStore.NotesMetadataResultSpec()
    search_spec.includeAttributes = True;
    search_spec.includeCreated = True;
    search_spec.includeUpdated = True;
    search_spec.includeTitle = True;
    try :
        noteList = note_store.findNotesMetadata(token, note_filter, 0, 100, search_spec)
        for n in noteList.notes:
            whole_content += getWholeContentOfNote(note_store, token, n.guid) + ' '
            notes.append({
                "title": n.title,
                "note_id": n.guid,
                "updated": n.updated,
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


