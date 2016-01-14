# -​*- coding: utf-8 -*​-
import sys
import nltk
from nltk import word_tokenize, pos_tag
from StringIO import StringIO
from nltk.corpus import stopwords
from nltk.text import Text
sys.stdout = StringIO()
from nltk.book import *
sys.stdout = sys.__stdout__

f = open('input.txt')
input = f.read()
f.close()
input = input.decode('utf-8')
 
stop_words = set(stopwords.words('english'))

tokens = nltk.word_tokenize(input)
tagged = nltk.pos_tag(tokens)
nouns = [item[0] for item in tagged if item[1][0] == 'N' if item[0] not in stop_words]
fdist1 = FreqDist(nouns) 
top_words = fdist1.most_common(100) 

print ""
print "----------Extracted Nouns: "
print nouns
print ""
print "----------Top100 Words: "
print top_words 
print ""

def getTopWords(top_words):
	return top_words

getTopWords(top_words)
