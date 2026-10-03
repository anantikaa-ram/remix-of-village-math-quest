# Trains the struggle-prediction model. Run from project root: python3 scripts/train_model.py
import pandas as pd, numpy as np, json
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import GroupShuffleSplit
from sklearn.metrics import roc_auc_score, accuracy_score, confusion_matrix, brier_score_loss
d=pd.read_csv('data/student_math_learning_dataset.csv')
F=['difficulty_level','topic_historical_accuracy','topic_attempts_count','recent_window_accuracy','current_streak','consecutive_errors','session_question_index','days_since_last_practice','topic_difficulty_baseline','diagnostic_baseline_score']
X=d[F].values; y=d.struggled.values
tr,te=next(GroupShuffleSplit(1,test_size=0.2,random_state=7).split(X,y,d.student_id))
mu,sd=X[tr].mean(0),X[tr].std(0); Z=(X-mu)/sd
lr=LogisticRegression(max_iter=2000).fit(Z[tr],y[tr]); p=lr.predict_proba(Z[te])[:,1]
gb=GradientBoostingClassifier(random_state=0).fit(X[tr],y[tr]); pg=gb.predict_proba(X[te])[:,1]
base=np.full(len(te),y[tr].mean())
cm=confusion_matrix(y[te],p>=.5).tolist()
# calibration bins
bins=[{"pred":float(p[(p>=a)&(p<a+.1)].mean()),"obs":float(y[te][(p>=a)&(p<a+.1)].mean()),"n":int(((p>=a)&(p<a+.1)).sum())} for a in np.arange(0,1,.1) if ((p>=a)&(p<a+.1)).sum()>20]
topic=d.iloc[te].assign(p=p).groupby('topic').agg(rate=('struggled','mean'),pred=('p','mean'),n=('p','size')).reset_index().to_dict('records')
out={"features":F,"mean":mu.tolist(),"std":sd.tolist(),"coef":lr.coef_[0].tolist(),"intercept":float(lr.intercept_[0]),
"metrics":{"logreg":{"auc":roc_auc_score(y[te],p),"acc":accuracy_score(y[te],p>=.5),"brier":brier_score_loss(y[te],p)},
 "gboost":{"auc":roc_auc_score(y[te],pg),"acc":accuracy_score(y[te],pg>=.5),"brier":brier_score_loss(y[te],pg)},
 "baseline":{"auc":0.5,"acc":max(y[te].mean(),1-y[te].mean()),"brier":brier_score_loss(y[te],base)}},
"gbImportance":dict(zip(F,gb.feature_importances_.tolist())),"confusion":cm,"calibration":bins,"topics":topic,
"topicBaseline":d.groupby("topic").topic_difficulty_baseline.first().to_dict(),"data":{"rows":len(d),"students":int(d.student_id.nunique()),"train":len(tr),"test":len(te),"struggleRate":float(y.mean())}}
json.dump(out,open('src/lib/model.json','w'),indent=1)
print(json.dumps(out["metrics"],indent=1)); print(dict(zip(F,np.round(lr.coef_[0],2))))
