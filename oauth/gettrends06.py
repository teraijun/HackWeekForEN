# -​*- coding: utf-8 -*​-
import sys
import nltk
import getmtopwords02
import getparameters01
from nltk import word_tokenize, pos_tag
from StringIO import StringIO
from nltk.corpus import stopwords
from nltk.text import Text
sys.stdout = StringIO()
from nltk.book import *
sys.stdout = sys.__stdout__

def gettrends():
	
	input = []
	mtopwords = []
	term, topcount, zeroratio, weight = getparameters01.getparameters()
	
	for i in range(0, term):
		f = open('%i.txt' % i)
		input.append(f.read())
		f.close()
		input[i] = input[i].decode('utf-8', errors="ignore")
		t = getmtopwords02.getmtopwords(input[i])
		mtopwords.append(t)
	
		if topcount > len(mtopwords[i][0]):
			tcount = len(mtopwords[i][0])
		else:
			tcount = topcount
		for n in range(0, tcount):
			f = float(mtopwords[i][0][n][1]) / mtopwords[i][1] * 100.0
			mtopwords[i][0][n] = mtopwords[i][0][n] + (f,)
	
	#この段階で以下のようなデータ構造になっている
	#	mtopwords[month][0] : [(word1, count1, freq1), (word2, count2, freq2), ..., (word10, count10, freq10), ..., (wordtopcount, counttopcount, freqtopcount), (wordtopcount+1, counttopcount+1), ..., (wordx, countx)]
	#	mtopwords[month][0][x]（topcount位まで） : その月のx位の用語とそのカウントと頻度 : (wordx, countx, freqx)
	#	mtopwords[month][0][x]（topcount位以降） : その月のx位の用語とそのカウント : (wordx, countx)
	#	↑頻度はtopcountまでしか計算していないのでデータ構造が途中で変わることに注意
	#	mtopwords[month][1] : その月の総単語数
	
	#ここから下でトレンド抽出
	#なるべくシンプルな計算とするため、条件を以下のようにシンプル化した
	#
	#1)各月のトップ??（topcountで定義）キーワードであること
	#2)前月と、過去の半年間の平均と比較する
	#3)前月との比率、過去半年間の平均との比率との重みはweightで定義してスコア化し、スコア順に並び替える
	#過去の実績がゼロの場合はzeroratioで定義した数値を入れる
	#
	#この条件を元に(term/2-1)月前から最新月まで順番に計算していく
	#
	#完成形は、例えばterm=12の場合、topcount=10の場合
	#mtrendwords = [M6, M7, M8, M9, M10, M11]
	#MXの中身は、[(word1, score1), (word2, score2), ..., (word10, score10)]
	
	mtrendwords = []
	for m in range(term/2, term):
		mtw = []
		if topcount > len(mtopwords[m][0]):
			tcount = len(mtopwords[m][0])
		else:
			tcount = topcount
		for n in range(0, tcount):
			
			#キーワード"mtopwords[m][0][n][0]"について前月と過去平均の頻度を計算
			count = 0
			flag = 0
			pastsum = 0
			previousav = 0
			for p in range(m-(term/2), m):
				for pw in range(0, len(mtopwords[p][0])):
					if mtopwords[m][0][n][0] == mtopwords[p][0][pw][0]:
						pastsum = pastsum + mtopwords[p][0][pw][2]
						count = count + 1
						flag = 1
						if p == m-1:
							previousav = mtopwords[p][0][pw][2]
			if flag == 1:
				pastav = pastsum / count
			elif flag == 0:
				pastav = 0
			
			#以下、スコア化
			pastratio = 0
			previousratio = 0
			#過去の平均との比率
			if pastav == 0:
				pastratio = zeroratio
			else:
				pastratio = mtopwords[m][0][n][2] / pastav
			#前月との比率
			if previousav == 0:
				previousratio = zeroratio
			else:
				previousratio = mtopwords[m][0][n][2] / previousav
			score = pastratio * (1-weight) + previousratio * weight
			mtw.append((mtopwords[m][0][n][0], score))
		mtw = sorted(mtw, key=lambda score: score[1], reverse=True)
		mtrendwords.append(mtw)
		
#	#トレンドキーワードの出力
#	for i in range(0, term/2):
#		print ""
#		print "----------Month", i+term/2, ":"
#		#print "----------Month %i: " % i
#		print ""
#		#print mtrendwords[i]
#		for j in range(len(mtrendwords[i])):
#			print 'No', str(j+1).zfill(2), ':', mtrendwords[i][j][0], "|", mtrendwords[i][j][1]
	
	return mtrendwords