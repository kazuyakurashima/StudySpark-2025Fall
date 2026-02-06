"""
2026年度 study_content_types + problem_counts マイグレーションSQL生成スクリプト

Excel「2026年四谷大塚DB.xlsx」からデータを読み取り、
マイグレーションSQL（study_content_types の全面置換 + problem_counts の投入）を生成する。

Usage:
  python3 scripts/generate-problem-counts-sql.py

Output:
  supabase/migrations/20260206000002_update_content_types_and_problem_counts.sql
"""

import openpyxl
import sys
from pathlib import Path

XLSX_PATH = Path.home() / "Downloads" / "2026年四谷大塚DB.xlsx"
OUTPUT_PATH = Path(__file__).parent.parent / "supabase" / "migrations" / "20260206000002_update_content_types_and_problem_counts.sql"

# コース展開ルール: レベルに応じて利用可能なコース
LEVEL_TO_COURSES = {
    'A': ['A', 'B', 'C', 'S'],
    'B': ['B', 'C', 'S'],
    'C': ['C', 'S'],
    'S': ['S'],
}

# コンテンツタイプ定義
# (grade, subject, db_content_name, level, display_order, excel_sheet, excel_column)
# db_content_name: DB に保存される名前。名前衝突する場合は「予習：」「演習：」プレフィックス付き
CONTENT_DEFS = [
    # --- 5年 算数 (衝突なし) ---
    (5, '算数', '類題',         'A', 1, '小５算数予習', '類題'),
    (5, '算数', '基本問題',     'A', 2, '小５算数予習', '基本問題'),
    (5, '算数', '練習問題',     'B', 3, '小５算数予習', '練習問題'),
    (5, '算数', '実戦演習',     'C', 4, '小５算数演習', '実戦演習'),

    # --- 6年 算数 (衝突なし) ---
    (6, '算数', '重要問題',               'A', 1, '小６算数予習', '重要問題'),
    (6, '算数', '類題',                   'B', 2, '小６算数予習', '類題'),
    (6, '算数', 'ステップアップ演習',     'C', 3, '小６算数予習', 'ステップアップ演習'),
    (6, '算数', '基本問題',               'A', 4, '小６算数予習', '基本問題'),
    (6, '算数', '練習問題',               'C', 5, '小６算数予習', '練習問題'),
    (6, '算数', 'ステップ③（難関校対策）', 'S', 6, '小６算数演習', 'ステップ③（難関校対策）'),

    # --- 5年 国語 ---
    (5, '国語', '漢字', 'A', 1, '小５・６国語', '小５漢字'),

    # --- 6年 国語 ---
    (6, '国語', '漢字', 'A', 1, '小５・６国語', '小６漢字'),

    # --- 5年 理科 (練習問題が予習/演習で衝突 → 全項目にプレフィックス) ---
    (5, '理科', '予習：要点チェック',   'A', 1, '小５理科予習', '要点チェック'),
    (5, '理科', '予習：練習問題',       'A', 2, '小５理科予習', '練習問題'),
    (5, '理科', '演習：基本問題',       'A', 3, '小５理科演習', '基本問題'),
    (5, '理科', '演習：練習問題',       'B', 4, '小５理科演習', '練習問題'),
    (5, '理科', '演習：発展問題',       'C', 5, '小５理科演習', '発展問題'),
    (5, '理科', '演習：応用問題',       'S', 6, '小５理科演習', '応用問題'),
    (5, '理科', '演習：チャレンジ問題', 'S', 7, '小５理科演習', 'チャレンジ問題'),

    # --- 6年 理科 (練習問題・応用問題が予習/演習で衝突 → 全項目にプレフィックス) ---
    (6, '理科', '予習：練習問題',       'A', 1, '小６理科予習', '練習問題'),
    (6, '理科', '予習：応用問題',       'C', 2, '小６理科予習', '応用問題'),
    (6, '理科', '演習：基本問題',       'A', 3, '小６理科演習', '基本問題'),
    (6, '理科', '演習：練習問題',       'B', 4, '小６理科演習', '練習問題'),
    (6, '理科', '演習：発展問題',       'C', 5, '小６理科演習', '発展問題'),
    (6, '理科', '演習：応用問題',       'S', 6, '小６理科演習', '応用問題'),
    (6, '理科', '演習：チャレンジ問題', 'S', 7, '小６理科演習', 'チャレンジ問題'),

    # --- 5年 社会 (衝突なし: 予習は「練習」、演習は「練習問題」で名前が異なる) ---
    (5, '社会', '要点チェック', 'A', 1, '小５社会予習', '要点チェック'),
    (5, '社会', '練習',         'A', 2, '小５社会予習', '練習'),
    (5, '社会', '練習問題',     'A', 3, '小５社会演習', '練習問題'),
    (5, '社会', '発展問題',     'B', 4, '小５社会演習', '発展問題'),
    (5, '社会', '応用',         'C', 5, '小５社会演習', '応用'),
    (5, '社会', 'チャレンジ',   'S', 6, '小５社会演習', 'チャレンジ'),

    # --- 6年 社会 (練習問題が予習/演習で衝突 → 全項目にプレフィックス) ---
    (6, '社会', '予習：要点チェック', 'A', 1, '小6社会予習', '要点チェック'),
    (6, '社会', '予習：練習問題',     'A', 2, '小6社会予習', '練習問題'),
    (6, '社会', '演習：練習問題',     'A', 3, '小6社会演習', '練習問題'),
    (6, '社会', '演習：応用',         'B', 4, '小6社会演習', '応用'),
    (6, '社会', '演習：チャレンジ',   'C', 5, '小6社会演習', 'チャレンジ'),
    (6, '社会', '演習：発展',         'S', 6, '小6社会演習', '発展'),
]


def read_excel_data(wb):
    """Excelの各データシートを読み込み、{sheet_name: {session_number: {column: value}}} を返す"""
    data = {}
    target_sheets = [
        '小５算数予習', '小５算数演習',
        '小６算数予習', '小６算数演習',
        '小５・６国語',
        '小５理科予習', '小５理科演習',
        '小６理科予習', '小６理科演習',
        '小５社会予習', '小５社会演習',
        '小6社会予習', '小6社会演習',
    ]
    for sheet_name in target_sheets:
        ws = wb[sheet_name]
        rows = list(ws.iter_rows(min_row=1, values_only=True))
        if not rows:
            continue
        headers = [str(h) if h else '' for h in rows[0]]
        sheet_data = {}
        for row in rows[1:]:
            session_num = row[0]
            if session_num is None or not isinstance(session_num, (int, float)):
                continue
            session_num = int(session_num)
            row_data = {}
            for i, val in enumerate(row[1:], 1):
                if i < len(headers) and headers[i]:
                    if val is not None and val != '' and val != 'なし':
                        try:
                            num = int(float(str(val)))
                            if num > 0:
                                row_data[headers[i]] = num
                        except (ValueError, TypeError):
                            pass
            if row_data:
                sheet_data[session_num] = row_data
        data[sheet_name] = sheet_data
    return data


def generate_content_types_sql():
    """study_content_types の INSERT SQL を生成"""
    lines = []
    for grade, subject, name, level, order, _, _ in CONTENT_DEFS:
        courses = LEVEL_TO_COURSES[level]
        for course in courses:
            lines.append(
                f"  ({grade}, v_{subject_var(subject)}, '{course}', "
                f"'{sql_escape(name)}', {order})"
            )
    return lines


def generate_problem_counts_sql(excel_data):
    """problem_counts の INSERT SQL を生成"""
    lines = []
    for grade, subject, db_name, level, _, sheet_name, col_name in CONTENT_DEFS:
        sheet_data = excel_data.get(sheet_name, {})
        courses = LEVEL_TO_COURSES[level]
        for session_num, row_data in sorted(sheet_data.items()):
            val = row_data.get(col_name)
            if val and val > 0:
                for course in courses:
                    lines.append(
                        f"    (ct_id({grade}, v_{subject_var(subject)}, '{course}', "
                        f"'{sql_escape(db_name)}'), "
                        f"ss_id({grade}, {session_num}), {val})"
                    )
    return lines


def subject_var(subject_name):
    """科目名を変数名に変換"""
    mapping = {'算数': 'math_id', '国語': 'japanese_id', '理科': 'science_id', '社会': 'social_id'}
    return mapping[subject_name]


def sql_escape(s):
    """SQLの文字列エスケープ"""
    return s.replace("'", "''")


def main():
    if not XLSX_PATH.exists():
        print(f"Error: {XLSX_PATH} not found")
        sys.exit(1)

    print(f"Reading {XLSX_PATH}...")
    wb = openpyxl.load_workbook(str(XLSX_PATH), data_only=True)
    excel_data = read_excel_data(wb)

    # 統計
    total_sessions = sum(len(v) for v in excel_data.values())
    print(f"  Sheets: {len(excel_data)}")
    print(f"  Total session-rows with data: {total_sessions}")

    # study_content_types 行数
    ct_lines = generate_content_types_sql()
    print(f"  study_content_types rows: {len(ct_lines)}")

    # problem_counts 行数
    pc_lines = generate_problem_counts_sql(excel_data)
    print(f"  problem_counts rows: {len(pc_lines)}")

    # SQL 生成
    sql = []
    sql.append("-- =============================================================================")
    sql.append("-- 2026年度: study_content_types 全面置換 + problem_counts 投入")
    sql.append("-- 作成日: 2026-02-06")
    sql.append("-- 生成元: scripts/generate-problem-counts-sql.py")
    sql.append("-- ソース: 2026年四谷大塚DB.xlsx")
    sql.append("--")
    sql.append(f"-- study_content_types: {len(ct_lines)} 件")
    sql.append(f"-- problem_counts: {len(pc_lines)} 件")
    sql.append("--")
    sql.append("-- 注記:")
    sql.append("-- - study_content_types を DELETE → INSERT で全面置換")
    sql.append("-- - problem_counts は study_content_types への CASCADE で自動削除される")
    sql.append("-- - 既存の study_logs がある場合は FK 制約で失敗する（安全装置）")
    sql.append("-- =============================================================================")
    sql.append("")
    sql.append("DO $$")
    sql.append("DECLARE")
    sql.append("  v_math_id BIGINT;")
    sql.append("  v_japanese_id BIGINT;")
    sql.append("  v_science_id BIGINT;")
    sql.append("  v_social_id BIGINT;")
    sql.append("BEGIN")
    sql.append("  -- 科目ID取得")
    sql.append("  SELECT id INTO v_math_id FROM public.subjects WHERE name = '算数';")
    sql.append("  SELECT id INTO v_japanese_id FROM public.subjects WHERE name = '国語';")
    sql.append("  SELECT id INTO v_science_id FROM public.subjects WHERE name = '理科';")
    sql.append("  SELECT id INTO v_social_id FROM public.subjects WHERE name = '社会';")
    sql.append("")
    sql.append("  -- =========================================================================")
    sql.append("  -- 1. 既存 study_content_types を削除（CASCADE で problem_counts も削除）")
    sql.append("  -- =========================================================================")
    sql.append("  DELETE FROM public.study_content_types;")
    sql.append("  RAISE NOTICE 'study_content_types 削除完了';")
    sql.append("")
    sql.append("  -- =========================================================================")
    sql.append("  -- 2. 2026年度 study_content_types を投入")
    sql.append("  -- =========================================================================")
    sql.append("  INSERT INTO public.study_content_types (grade, subject_id, course, content_name, display_order) VALUES")
    sql.append(",\n".join(ct_lines))
    sql.append("  ON CONFLICT (grade, subject_id, course, content_name) DO NOTHING;")
    sql.append(f"  RAISE NOTICE 'study_content_types 投入完了: {len(ct_lines)} 件';")
    sql.append("")
    sql.append("END $$;")
    sql.append("")
    sql.append("-- =============================================================================")
    sql.append("-- 3. problem_counts 投入")
    sql.append("-- =============================================================================")
    sql.append("")
    sql.append("-- ヘルパー関数: study_content_type_id を取得")
    sql.append("CREATE OR REPLACE FUNCTION pg_temp.ct_id(")
    sql.append("  p_grade SMALLINT, p_subject_id BIGINT, p_course TEXT, p_name TEXT")
    sql.append(") RETURNS BIGINT AS $fn$")
    sql.append("  SELECT id FROM public.study_content_types")
    sql.append("  WHERE grade = p_grade AND subject_id = p_subject_id")
    sql.append("    AND course = p_course AND content_name = p_name;")
    sql.append("$fn$ LANGUAGE SQL STABLE;")
    sql.append("")
    sql.append("-- ヘルパー関数: study_session_id を取得")
    sql.append("CREATE OR REPLACE FUNCTION pg_temp.ss_id(")
    sql.append("  p_grade SMALLINT, p_session_number SMALLINT")
    sql.append(") RETURNS BIGINT AS $fn$")
    sql.append("  SELECT id FROM public.study_sessions")
    sql.append("  WHERE grade = p_grade AND session_number = p_session_number;")
    sql.append("$fn$ LANGUAGE SQL STABLE;")
    sql.append("")

    # problem_counts を科目・学年ごとにグループ化して INSERT
    sql.append("DO $$")
    sql.append("DECLARE")
    sql.append("  v_math_id BIGINT;")
    sql.append("  v_japanese_id BIGINT;")
    sql.append("  v_science_id BIGINT;")
    sql.append("  v_social_id BIGINT;")
    sql.append("BEGIN")
    sql.append("  SELECT id INTO v_math_id FROM public.subjects WHERE name = '算数';")
    sql.append("  SELECT id INTO v_japanese_id FROM public.subjects WHERE name = '国語';")
    sql.append("  SELECT id INTO v_science_id FROM public.subjects WHERE name = '理科';")
    sql.append("  SELECT id INTO v_social_id FROM public.subjects WHERE name = '社会';")
    sql.append("")
    sql.append("  INSERT INTO public.problem_counts (study_content_type_id, session_id, total_problems) VALUES")
    sql.append(",\n".join(pc_lines))
    sql.append("  ON CONFLICT (study_content_type_id, session_id) DO UPDATE SET total_problems = EXCLUDED.total_problems;")
    sql.append(f"  RAISE NOTICE 'problem_counts 投入完了: {len(pc_lines)} 件';")
    sql.append("")
    sql.append("END $$;")
    sql.append("")
    sql.append("-- =============================================================================")
    sql.append("-- 検証クエリ（実行後に確認用）")
    sql.append("-- =============================================================================")
    sql.append("-- SELECT grade, count(*) FROM study_content_types GROUP BY grade ORDER BY grade;")
    sql.append("-- SELECT s.name, sct.grade, count(*) FROM problem_counts pc")
    sql.append("--   JOIN study_content_types sct ON pc.study_content_type_id = sct.id")
    sql.append("--   JOIN subjects s ON sct.subject_id = s.id")
    sql.append("--   GROUP BY s.name, sct.grade ORDER BY sct.grade, s.name;")

    # ファイル出力
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        f.write('\n'.join(sql) + '\n')

    print(f"\nGenerated: {OUTPUT_PATH}")
    print("Done!")


if __name__ == '__main__':
    main()
