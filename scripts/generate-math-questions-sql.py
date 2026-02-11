#!/usr/bin/env python3
"""算数自動採点 — 本番問題データ SQL 生成スクリプト

Usage:
    python3 scripts/generate-math-questions-sql.py > supabase/seeds/math_questions_2026.sql

入力: ユーザー提供の模範解答データ (このスクリプト内にハードコード)
出力: question_sets + questions の INSERT SQL (458問)

データソース:
    マスタープリント 小5上 第1回〜第4回 (①②) = 277問
    マスタープリント 小6上 第1回〜第4回 (①②) = 181問 → 実際は177問
    合計: 458問 (計画書 01_Math-AutoGrading-Plan.md Section 2-3 準拠)
"""
import json
import sys

# ============================================================================
# ヘルパー関数: 問題データ構造を生成
# ============================================================================

def n(answers_str, unit=None):
    """空白区切りの数値文字列 → numeric 問題リスト"""
    return [{"type": "numeric", "answer": a, "unit": unit}
            for a in answers_str.split()]

def nu(answer, unit=None):
    """単一 numeric 問題"""
    return {"type": "numeric", "answer": answer, "unit": unit}

def sel(correct, dummy, unit=None):
    """selection 問題"""
    return {"type": "selection", "correct_values": correct,
            "dummy_values": dummy, "unit": unit}

def mp(slots, values, template=None):
    """multi_part 問題
    slots: [(label, unit), ...]
    values: {label: correct_value, ...}
    """
    if template is None:
        parts = []
        for label, unit in slots:
            parts.append(f"{label}{{{label}}}{unit}")
        template = "，".join(parts)
    return {
        "type": "multi_part",
        "slots": [{"label": lb, "unit": u} for lb, u in slots],
        "correct_values": values,
        "template": template,
    }

# ============================================================================
# 問題データ定義 (全458問)
# ============================================================================

SETS = [
    # ================================================================
    # 小5 第1回① 倍数と約数の利用 (40問)
    # ================================================================
    {
        "grade": 5, "session": 1, "order": 1, "title": "第1回① 倍数と約数の利用",
        "sections": [
            ("類題1", n("11 10 12 12 33 12 28 12 16 9", "個")),
            ("類題2", [
                sel(["5","6","10","15","30"], ["4","8","12","20","25"]),
                sel(["9","12","18","36"], ["6","15","24","30"]),
                sel(["7","14","21","42"], ["6","12","28","35"]),
                sel(["16","32"], ["8","24","48"]),
                sel(["12","18","36"], ["9","15","24"]),
            ]),
            ("類題3", [
                mp([("①",""),("②","")], {"①":"180","②":"1020"}),
                mp([("①",""),("②","")], {"①":"360","②":"990"}),
                mp([("①",""),("②","")], {"①":"240","②":"2016"}),
                mp([("①",""),("②","")], {"①":"900","②":"1980"}),
                mp([("①",""),("②","")], {"①":"840","②":"560"}),
            ]),
            ("計算練習", n("72 70 120 64 108 105 72 108 84 75 128 144 96 125 84 128 180 84 126 105")),
        ],
    },
    # ================================================================
    # 小5 第1回② 倍数と約数の利用 (35問)
    # ================================================================
    {
        "grade": 5, "session": 1, "order": 2, "title": "第1回② 倍数と約数の利用",
        "sections": [
            ("類題（基本問題１(8)）", [
                sel(["32","62","92"], ["22","52","82"]),
                sel(["13","25","37"], ["7","19","43"]),
                sel(["17","32","47"], ["7","22","52"]),
                sel(["21","39","57"], ["15","33","51"]),
                sel(["25","49","73"], ["19","43","67"]),
            ]),
            ("類題5", [
                sel(["29","59","89"], ["19","49","99"]),
                sel(["17","35","53"], ["11","23","47"]),
                sel(["22","46","70"], ["10","34","58"]),
                sel(["33","68","103"], ["23","53","88"]),
                sel(["35","71","107"], ["17","53","89"]),
            ]),
            ("類題7", n("20 7 17 33 34", "個")),
            ("計算練習", n("12 14 24 12 12 18 24 42 25 18 4 4 5 4 8 9 3 5 3 5")),
        ],
    },
    # ================================================================
    # 小5 第2回① いろいろな図形の面積 (38問)
    # ================================================================
    {
        "grade": 5, "session": 2, "order": 1, "title": "第2回① いろいろな図形の面積",
        "sections": [
            ("類題1", n("17 19 36.5 80 53 33 14 18 49", "㎠")),
            ("類題2", n("36.48 16 4.71 20.56 18.24 57 25.12 9.12 20.52", "㎠")),
            ("計算練習", n(
                "3.14 6.28 9.42 12.56 15.7 18.84 21.98 25.12 28.26 31.4 "
                "72 125 84 192 140 216 144 120 150 140"
            )),
        ],
    },
    # ================================================================
    # 小5 第2回② いろいろな図形の面積 (38問)
    # ================================================================
    {
        "grade": 5, "session": 2, "order": 2, "title": "第2回② いろいろな図形の面積",
        "sections": [
            ("類題1", [
                nu("50.24","㎠"), nu("28.26","㎠"), nu("4.71","㎠"),
                nu("9.42","㎠"), nu("34","㎠"), nu("18.84","㎠"),
                nu("4.71","㎠"), nu("4","㎝"),
            ]),
            ("計算練習", n(
                "96 90 64 70 54 76 65 51 72 75 "
                "3.14 6.28 9.42 12.56 15.7 18.84 21.98 25.12 28.26 31.4 "
                "37.68 43.96 50.24 56.52 62.8 75.36 100.48 113.04 150.72 200.96"
            )),
        ],
    },
    # ================================================================
    # 小5 第3回① 割合の利用 (38問)
    # ================================================================
    {
        "grade": 5, "session": 3, "order": 1, "title": "第3回① 割合の利用",
        "sections": [
            ("類題1", [
                nu("25","％"), nu("360","mL"), nu("2000","円"),
                nu("64","％"), nu("320","g"), nu("600","円"),
            ]),
            ("類題2", [
                nu("140","ページ"), nu("150","問"), nu("330","ページ"),
                nu("50","問"), nu("220","ページ"), nu("60","問"),
            ]),
            ("類題3", n("200 120 180 520 120 300", "人")),
            ("計算練習", n("61 72 82 73 74 100 121 119 192 180 56 28 55 48 18 108 72 76 59 24")),
        ],
    },
    # ================================================================
    # 小5 第3回② 相当算 (28問)
    # ================================================================
    {
        "grade": 5, "session": 3, "order": 2, "title": "第3回② 相当算",
        "sections": [
            ("類題4", [
                nu("120","ページ"), nu("1200","円"), nu("6000","円"),
                nu("120","ページ"), nu("5000","円"), nu("300","ページ"),
                nu("185","ページ"), nu("210","ページ"), nu("550","円"),
                nu("2400","円"), nu("195","ページ"), nu("975","円"),
            ]),
            ("計算練習", n("24 18 15 10 12 20 8 32 54 32 21 30 36 32 81 72")),
        ],
    },
    # ================================================================
    # 小5 第4回① 差集め算 (32問)
    # ================================================================
    {
        "grade": 5, "session": 4, "order": 1, "title": "第4回① 差集め算",
        "sections": [
            ("類題1", n("900 2400 4050 2750 3400 5250", "円")),
            ("類題2", [
                nu("100","枚"), nu("33","個"), nu("10","本"),
                nu("78","枚"), nu("91","個"), nu("90","本"),
            ]),
            ("計算練習", n(
                "720 700 1200 640 1080 1050 720 1080 840 750 "
                "1280 1440 960 1250 840 1280 1800 840 1260 1050"
            )),
        ],
    },
    # ================================================================
    # 小5 第4回② 差集め算 (32問)
    # ================================================================
    {
        "grade": 5, "session": 4, "order": 2, "title": "第4回② 差集め算",
        "sections": [
            ("類題3", [
                mp([("A","個"),("B","個")], {"A":"14","B":"11"}),
                mp([("A","個"),("B","個")], {"A":"34","B":"30"}),
                mp([("A","個"),("B","個")], {"A":"25","B":"20"}),
                mp([("A","個"),("B","個")], {"A":"18","B":"12"}),
            ]),
            ("類題4", n("1540 490 510 620", "円")),
            ("類題6", [
                mp([("60円切手","枚"),("90円切手","枚")], {"60円切手":"11","90円切手":"4"}),
                mp([("50円切手","枚"),("70円切手","枚")], {"50円切手":"11","70円切手":"8"}),
                mp([("100円切手","枚"),("120円切手","枚")], {"100円切手":"12","120円切手":"8"}),
                mp([("50円切手","枚"),("80円切手","枚")], {"50円切手":"5","80円切手":"8"}),
            ]),
            ("計算練習", n("24 35 25 45 36 35 16 15 28 75 15 4 15 24 20 64 45 15 14 6")),
        ],
    },

    # ================================================================
    # 小6 第1回① 文章題 (41問)
    # ================================================================
    {
        "grade": 6, "session": 1, "order": 1, "title": "第1回① 文章題",
        "sections": [
            ("類題1", [
                nu("14","個"), nu("23","個"), nu("15","人"), nu("340","円"),
                nu("12","本"), nu("25","本"), nu("19","本"), nu("22","冊"),
            ]),
            ("類題2", n("19 16 21 14 17 26 10 12 14 18", "歳")),
            ("類題3", [
                nu("2","班"), nu("6","冊"), nu("4","本"),
                nu("4","個"), nu("4","枚"), nu("3","本"),
            ]),
            ("類題4", n("40 150 80 100 200", "円")),
            ("類題5", n("200 120 600 250", "円")),
            ("類題6", n("275 130 140", "円")),
            ("類題7", [
                nu("2","通り"), nu("4","本"), nu("5","個"), nu("6","個"),
                mp(
                    [("①",""),("②",""),("③",""),("④",""),("⑤",""),
                     ("⑥",""),("⑦",""),("⑧",""),("⑨","")],
                    {"①":"4","②":"8","③":"12","④":"16","⑤":"20",
                     "⑥":"24","⑦":"28","⑧":"32","⑨":"36"}
                ),
            ]),
        ],
    },
    # ================================================================
    # 小6 第1回② 文章題 (41問)
    # ================================================================
    {
        "grade": 6, "session": 1, "order": 2, "title": "第1回② 文章題",
        "sections": [
            ("平均算（合計の利用）", [
                nu("50.9","点"), nu("75","点"), nu("86","点"), nu("75","点"),
                nu("97","点"), nu("84","点"), nu("96","点"), nu("80","点"),
                nu("83","点"), nu("8.25","点"), nu("78","点"), nu("78","点"),
            ]),
            ("平均算（面積図）", [
                nu("9","回目"), nu("70","人"), nu("78","点"),
                mp([("A","冊"),("B","冊")], {"A":"15","B":"35"}),
                nu("57","点"), nu("9","回目"),
            ]),
            ("差集め算", [
                nu("10","個"), nu("264","個"),
                mp([("ア",""),("イ","")], {"ア":"19","イ":"149"}),
                mp([("①","人"),("②","個")], {"①":"16","②":"180"}),
                nu("230","mL"), nu("62","個"), nu("42","人"), nu("17","脚"),
                nu("1200","m"), nu("720","円"), nu("600","円"),
                mp([("①","個"),("②","人")], {"①":"4","②":"12"}),
            ]),
            ("年齢算", [
                nu("3","年後"), nu("15","年後"), nu("5","年後"), nu("13","才"),
                mp([("母","才"),("子","才")], {"母":"32","子":"12"}),
                mp([("父","才"),("母","才"),("子","才")],
                   {"父":"36","母":"32","子":"12"}),
            ]),
            ("集合", [
                nu("22","人"),
                mp([("①","人"),("②","人"),("③","人")],
                   {"①":"5","②":"5","③":"2"}),
                mp([("①","人"),("②","人"),("③","人"),("④","人"),("⑤","人"),("⑥","人")],
                   {"①":"10","②":"12","③":"5","④":"12","⑤":"3","⑥":"4"}),
                mp([("①","人"),("②","人"),("③","人"),("④","人"),
                    ("⑤","人"),("⑥","人"),("⑦","人")],
                   {"①":"27","②":"23","③":"17","④":"5",
                    "⑤":"16","⑥":"12","⑦":"4"}),
                nu("3","こ"),
            ]),
        ],
    },
    # ================================================================
    # 小6 第2回① 規則性 (16問)
    # ================================================================
    {
        "grade": 6, "session": 2, "order": 1, "title": "第2回① 規則性",
        "sections": [
            ("植木算", [
                nu("32","m"), nu("228","m"), nu("12","本"),
                mp([("①","㎝"),("②","㎝")], {"①":"37.5","②":"20"}),
                mp([("①","m"),("②","本")], {"①":"252","②":"70"}),
            ]),
            ("周期算", [
                mp([("①",""),("②",""),("③","")], {"①":"7","②":"1","③":"193"}),
                sel(["金曜日"], ["月曜日","火曜日","水曜日","木曜日","土曜日","日曜日"]),
                nu("49","個"),
                mp([("①","㎝"),("②","個")], {"①":"21","②":"20"}),
                nu("9", None),
            ]),
            ("等差数列", [
                mp([("①",""),("②","個"),("③","")], {"①":"77","②":"21","③":"861"}),
                mp([("①",""),("②","個"),("③","")], {"①":"176","②":"34","③":"3434"}),
                mp([("①",""),("②","個"),("③","")], {"①":"28","②":"34","③":"1717"}),
            ]),
            ("長方形をならべて", n("1100 720", "㎠")),
        ],
    },
    # ================================================================
    # 小6 第2回② 規則性 (6問)
    # ================================================================
    {
        "grade": 6, "session": 2, "order": 2, "title": "第2回② 規則性",
        "sections": [
            ("方陣算", [
                mp([("①","個"),("②","個")], {"①":"225","②":"56"}),
                mp([("①","個"),("②","個")], {"①":"78","②":"33"}),
                nu("235","個"),
            ]),
            ("周期算②", [
                mp([("①","㎠"),("②","枚"),("③","㎝"),("④","枚")],
                   {"①":"151","②":"13","③":"124","④":"16"}),
                nu("4", None),
                nu("7", None),
            ]),
        ],
    },
    # ================================================================
    # 小6 第3回① 平面図形(1) (32問)
    # ================================================================
    {
        "grade": 6, "session": 3, "order": 1, "title": "第3回① 平面図形(1)",
        "sections": [
            ("角度", [
                mp([("ア","°"),("イ","°")], {"ア":"111","イ":"94"}),
                nu("76","°"), nu("38","°"), nu("46","°"),
                mp([("x","°"),("y","°")], {"x":"105","y":"120"}),
                nu("70","°"), nu("75","°"), nu("50","°"), nu("105","°"),
                nu("33","°"), nu("74","°"), nu("60","°"), nu("105","°"),
                nu("30","°"), nu("15","°"),
                mp([("x","°"),("y","°")], {"x":"75","y":"120"}),
                nu("150","°"), nu("75","°"), nu("69","°"),
                nu("14","°"), nu("39","°"),
            ]),
            ("面積", [
                mp([("①","㎠"),("②","㎝")], {"①":"216","②":"14.4"}),
                mp([("①","㎠"),("②","㎝")], {"①":"144","②":"9"}),
                nu("4.5","㎝"), nu("4","㎝"), nu("32","㎠"),
                nu("33","㎠"), nu("49","㎠"), nu("14","㎠"), nu("18","㎠"),
                nu("36","㎠"), nu("9","㎠"),
            ]),
        ],
    },
    # ================================================================
    # 小6 第3回② 平面図形(1) (21問)
    # ================================================================
    {
        "grade": 6, "session": 3, "order": 2, "title": "第3回② 平面図形(1)",
        "sections": [
            ("多角形の性質", [
                nu("27","本"), nu("1800","°"), nu("156","°"),
                sel(["十四角形"], ["十角形","十二角形","十六角形","十八角形"]),
            ]),
            ("面積の求め方の工夫", n("70 52 81 20 25 16", "㎠")),
            ("円とおうぎ形", [
                mp([("円周","㎝"),("面積","㎠")], {"円周":"50.24","面積":"200.96"}),
                mp([("弧","㎝"),("面積","㎠")], {"弧":"12.56","面積":"62.8"}),
                nu("36.48","㎠"), nu("12.5","㎠"), nu("50","㎠"),
                nu("9","㎠"), nu("16","㎠"), nu("5.7","㎝"), nu("0.86","㎝"),
                nu("18.5","㎠"), nu("69.08","㎠"),
            ]),
        ],
    },
    # ================================================================
    # 小6 第4回① 容器と水量・変化とグラフ (9問)
    # ================================================================
    {
        "grade": 6, "session": 4, "order": 1, "title": "第4回① 容器と水量・変化とグラフ",
        "sections": [
            ("底面積と深さ", [
                nu("7","㎝"),
                mp([("①","L"),("②","㎠")], {"①":"2.88","②":"144"}),
            ]),
            ("水そうグラフ", [
                nu("1.3","L"),
                mp([("①","L"),("②","L")], {"①":"2","②":"4"}),
                mp([("①","分後"),("②","分後")], {"①":"15","②":"10"}),
                nu("20","分後"),
            ]),
            ("容器の傾け", [
                mp([("a","㎝"),("b","㎝")], {"a":"14","b":"16"}),
                mp([("①","㎝"),("②","㎤")], {"①":"9","②":"810"}),
                nu("12","㎝"),
            ]),
        ],
    },
    # ================================================================
    # 小6 第4回② 容器と水量・変化とグラフ (12問)
    # ================================================================
    {
        "grade": 6, "session": 4, "order": 2, "title": "第4回② 容器と水量・変化とグラフ",
        "sections": [
            ("仕切りのある容器", [
                mp([("①","㎝"),("②","㎝")], {"①":"42","②":"40"}),
                mp([("①","分"),("②","㎝")], {"①":"25","②":"10"}),
            ]),
            ("容器の傾け②", [
                nu("3600","㎤"),
                mp([("①","㎝"),("②","㎤")], {"①":"11","②":"6200"}),
            ]),
            ("階段グラフ", n("1120 1300 800 1100", "円")),
            ("物体を沈める問題", [
                mp([("①","㎝"),("②","㎝")], {"①":"24","②":"29"}),
                mp([("①","㎝"),("②","㎝")], {"①":"30","②":"36"}),
                mp([("①","㎤"),("②","㎤")], {"①":"1600","②":"6000"}),
                mp([("①","㎝"),("②","㎝")], {"①":"17","②":"16"}),
            ]),
        ],
    },
]

# ============================================================================
# バリデーション
# ============================================================================

def validate():
    """データの整合性チェック"""
    errors = []
    totals = {"numeric": 0, "multi_part": 0, "selection": 0, "fraction": 0}
    grade_totals = {5: {"numeric": 0, "multi_part": 0, "selection": 0},
                    6: {"numeric": 0, "multi_part": 0, "selection": 0}}

    for qs in SETS:
        grade = qs["grade"]
        q_count = 0
        for section_name, questions in qs["sections"]:
            for q in questions:
                q_count += 1
                qtype = q["type"]
                totals[qtype] += 1
                grade_totals[grade][qtype] += 1

                loc = f"{qs['title']} {section_name} ({q_count})"

                # multi_part: 計画 Section 2-4 準拠バリデーション
                if qtype == "multi_part":
                    slot_labels = {s["label"] for s in q["slots"]}
                    cv_keys = set(q["correct_values"].keys())
                    # (a) slots ≡ correct_values キー集合
                    if slot_labels != cv_keys:
                        errors.append(
                            f"{loc}: slots={slot_labels} != "
                            f"correct_values={cv_keys}")
                    # (b) template 内の {label} が slots と完全一致
                    import re
                    tpl_labels = set(re.findall(r"\{([^}]+)\}", q["template"]))
                    if tpl_labels != slot_labels:
                        errors.append(
                            f"{loc}: template placeholders={tpl_labels} != "
                            f"slots={slot_labels}")

                # selection: 計画 Section 2-4 準拠バリデーション
                if qtype == "selection":
                    cv = q["correct_values"]
                    dv = q["dummy_values"]
                    # (a) correct ∩ dummy = ∅
                    overlap = set(cv) & set(dv)
                    if overlap:
                        errors.append(f"{loc}: correct/dummy overlap: {overlap}")
                    # (b) correct_values 内重複
                    if len(cv) != len(set(cv)):
                        errors.append(f"{loc}: correct_values has duplicates")
                    # (c) dummy_values 内重複
                    if len(dv) != len(set(dv)):
                        errors.append(f"{loc}: dummy_values has duplicates")

        # 問題数の表示
        print(f"  {qs['title']}: {q_count}問", file=sys.stderr)

    total = sum(totals.values())
    print(f"\n  合計: {total}問", file=sys.stderr)
    print(f"  内訳: {totals}", file=sys.stderr)
    print(f"  G5: {grade_totals[5]}", file=sys.stderr)
    print(f"  G6: {grade_totals[6]}", file=sys.stderr)

    if errors:
        for e in errors:
            print(f"  ERROR: {e}", file=sys.stderr)
        sys.exit(1)

    return total

# ============================================================================
# SQL 生成
# ============================================================================

def sql_str(val):
    """Python値 → SQL文字列リテラル"""
    if val is None:
        return "NULL"
    return "'" + str(val).replace("'", "''") + "'"

def sql_json(val):
    """Python dict/list → SQL JSONB リテラル"""
    if val is None:
        return "NULL"
    return "'" + json.dumps(val, ensure_ascii=False).replace("'", "''") + "'"

def generate_question_sql(q, qs_var, question_number, display_order):
    """1問分の VALUES 行を生成
    question_number: セクション内連番 (1, 2, ...)
    display_order: セット内通番 (1, 2, ..., N)
    """
    qtype = q["type"]
    qn = f"({question_number})"

    if qtype == "numeric":
        return (f"    ({qs_var}, '{qn}', {{section}}, 'numeric', "
                f"{sql_str(q['answer'])}, {sql_str(q.get('unit'))}, NULL, 1, {display_order})")

    elif qtype == "fraction":
        return (f"    ({qs_var}, '{qn}', {{section}}, 'fraction', "
                f"{sql_str(q['answer'])}, NULL, NULL, 1, {display_order})")

    elif qtype == "multi_part":
        config = {
            "slots": q["slots"],
            "correct_values": q["correct_values"],
            "template": q["template"],
        }
        return (f"    ({qs_var}, '{qn}', {{section}}, 'multi_part', "
                f"NULL, NULL, {sql_json(config)}, 1, {display_order})")

    elif qtype == "selection":
        config = {
            "correct_values": q["correct_values"],
            "dummy_values": q["dummy_values"],
        }
        if q.get("unit"):
            config["unit"] = q["unit"]
        return (f"    ({qs_var}, '{qn}', {{section}}, 'selection', "
                f"NULL, NULL, {sql_json(config)}, 1, {display_order})")

def generate_sql():
    """全体の SQL を生成"""
    lines = []
    lines.append("-- ============================================================================")
    lines.append("-- 算数自動採点 — 本番問題データ (458問)")
    lines.append("-- ============================================================================")
    lines.append("-- 生成元: scripts/generate-math-questions-sql.py")
    lines.append("-- 再生成: python3 scripts/generate-math-questions-sql.py > supabase/seeds/math_questions_2026.sql")
    lines.append("--")
    lines.append("-- 内容:")
    # 実データから問題数を集計
    g5_count = sum(sum(len(qs) for _, qs in s["sections"])
                   for s in SETS if s["grade"] == 5)
    g6_count = sum(sum(len(qs) for _, qs in s["sections"])
                   for s in SETS if s["grade"] == 6)
    lines.append(f"--   小5上 第1回〜第4回 (①②×4 = 8セット, {g5_count}問)")
    lines.append(f"--   小6上 第1回〜第4回 (①②×4 = 8セット, {g6_count}問)")
    lines.append("--   fraction 型: 0問 (今後追加可能)")
    lines.append("--")
    lines.append("-- 注意: approved済みセットはスキップ、draft は approved に昇格して再投入")
    lines.append("")
    lines.append("DO $$")
    lines.append("DECLARE")
    lines.append("  v_math_id         BIGINT;")
    lines.append("  v_sid             BIGINT;")
    lines.append("  v_qs              BIGINT;")
    lines.append("  v_count           INTEGER := 0;")
    lines.append("  v_existing_id     BIGINT;")
    lines.append("  v_existing_status VARCHAR(20);")
    lines.append("BEGIN")
    lines.append("")
    lines.append("  -- 算数の subject_id を取得")
    lines.append("  SELECT id INTO STRICT v_math_id")
    lines.append("  FROM public.subjects WHERE name = '算数';")
    lines.append("")

    for qs in SETS:
        grade = qs["grade"]
        session = qs["session"]
        order = qs["order"]
        title = qs["title"]

        # セクションヘッダー
        total_q = sum(len(questions) for _, questions in qs["sections"])
        lines.append(f"  -- ========================================")
        lines.append(f"  -- 小{grade} {title} ({total_q}問)")
        lines.append(f"  -- ========================================")
        lines.append(f"  SELECT id INTO STRICT v_sid")
        lines.append(f"  FROM public.study_sessions WHERE grade = {grade} AND session_number = {session};")
        lines.append(f"")
        # 3分岐: 既存チェック → (1)なし→INSERT / (2)approved→SKIP / (3)draft→昇格
        lines.append(f"  SELECT id, status INTO v_existing_id, v_existing_status")
        lines.append(f"  FROM public.question_sets")
        lines.append(f"  WHERE session_id = v_sid AND subject_id = v_math_id AND display_order = {order};")
        lines.append(f"")
        lines.append(f"  IF v_existing_status = 'approved' THEN")
        lines.append(f"    RAISE NOTICE 'スキップ: 小{grade} {title}（approved済み）';")
        lines.append(f"  ELSE")
        lines.append(f"    -- 新規 or draft昇格")
        lines.append(f"    IF v_existing_id IS NOT NULL THEN")
        lines.append(f"      -- draft → approved に昇格、既存 questions を入れ替え")
        lines.append(f"      DELETE FROM public.questions WHERE question_set_id = v_existing_id;")
        lines.append(f"      UPDATE public.question_sets")
        lines.append(f"      SET status = 'approved', title = {sql_str(title)}, updated_at = now()")
        lines.append(f"      WHERE id = v_existing_id;")
        lines.append(f"      v_qs := v_existing_id;")
        lines.append(f"      RAISE NOTICE 'draft昇格: 小{grade} {title}';")
        lines.append(f"    ELSE")
        lines.append(f"      -- 新規INSERT")
        lines.append(f"      INSERT INTO public.question_sets")
        lines.append(f"        (session_id, subject_id, grade, title, display_order, status)")
        lines.append(f"      VALUES")
        lines.append(f"        (v_sid, v_math_id, {grade}, {sql_str(title)}, {order}, 'approved')")
        lines.append(f"      RETURNING id INTO v_qs;")
        lines.append(f"    END IF;")
        lines.append(f"")

        # 問題の INSERT（新規・draft昇格 共通）
        lines.append(f"    INSERT INTO public.questions")
        lines.append(f"      (question_set_id, question_number, section_name, answer_type,")
        lines.append(f"       correct_answer, unit_label, answer_config, points, display_order)")
        lines.append(f"    VALUES")

        display_order = 0
        value_lines = []
        for section_name, questions in qs["sections"]:
            section_num = 0  # セクション内連番
            for q in questions:
                display_order += 1
                section_num += 1
                line = generate_question_sql(q, "v_qs", section_num, display_order)
                line = line.replace("{section}", sql_str(section_name))
                value_lines.append(line)

        # VALUES 行をカンマ区切りで結合
        lines.append(",\n".join(value_lines) + ";")
        lines.append(f"")
        lines.append(f"    v_count := v_count + {display_order};")
        lines.append(f"  END IF;  -- approved / ELSE")
        lines.append(f"")

    lines.append(f"  RAISE NOTICE '本番問題データ投入完了: %問', v_count;")
    lines.append(f"")
    lines.append(f"END $$;")
    lines.append("")

    return "\n".join(lines)

# ============================================================================
# メイン
# ============================================================================

EXPECTED_TOTAL = 458  # G5: 281 + G6: 177

if __name__ == "__main__":
    total = validate()
    assert total == EXPECTED_TOTAL, (
        f"問題数が期待値と不一致: {total} != {EXPECTED_TOTAL}"
    )
    sql = generate_sql()
    print(sql)
