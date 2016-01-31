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

def getmtopwords(input):
	#input = mtext.decode('utf-8', errors="ignore")
 	
	stop_words = set(stopwords.words('english'))
	
	tokens = nltk.word_tokenize(input)
	tokens_l = [w.lower() for w in tokens]
	tagged = nltk.pos_tag(tokens_l)
	total = len(tokens_l)
	nouns = [item[0] for item in tagged if item[1][0] == 'N' if item[0] not in stop_words]
	fdist1 = FreqDist(nouns) 
	top_words = fdist1.most_common(100) 
	#mleprobdist1 = nltk.MLEProbDist(fdist1)
	#print fdist1
	#print mleprobdist1
	#print mleprobdist1.samples()
	
	
	#print ""
	#print "----------Extracted Nouns: "
	#print nouns
	#print ""
	#print "----------Top100 Words: "
	#print top_words 
	#print ""

	return [top_words, total]