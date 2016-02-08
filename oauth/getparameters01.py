# -​*- coding: utf-8 -*​-

def getparameters(arr):

	#入力するデータの月数
	term = len(arr)
	#各月ごとにカウントするキーワード数
	topcount = 1000
	#頻度を比較する際に分母（過去や前月の頻度）がゼロだった時に（ゼロで割れないため）代入する値を固定で設定する
	zeroratio = 0
	#前月の比重　※前月と過去との比率について、前月の設定値。過去の比率は1-weightとなる
	weight = 0.5
	
	return term, topcount, zeroratio, weight