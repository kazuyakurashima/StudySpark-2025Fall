-- ============================================================================
-- 小6 第2回②「規則性」に欠落していた10問を追加
-- 既存6問（方陣算3問 + 周期算②3問）はそのまま、display_order 7-16 を INSERT
-- ============================================================================

DO $$
DECLARE
  v_qs BIGINT;
  v_existing_count INT;
BEGIN
  -- 対象の question_set を取得
  SELECT qs.id INTO v_qs
  FROM public.question_sets qs
  JOIN public.study_sessions ss ON qs.session_id = ss.id
  WHERE ss.grade = 6
    AND ss.session_number = 2
    AND qs.display_order = 2
    AND qs.subject_id = (SELECT id FROM public.subjects WHERE name = '算数');

  IF v_qs IS NULL THEN
    RAISE EXCEPTION '小6 第2回② の question_set が見つかりません';
  END IF;

  -- 既に追加済みかチェック（冪等性）
  SELECT COUNT(*) INTO v_existing_count
  FROM public.questions
  WHERE question_set_id = v_qs AND display_order >= 7;

  IF v_existing_count > 0 THEN
    RAISE NOTICE '既に追加済み（display_order >= 7 が %件存在）。スキップします。', v_existing_count;
    RETURN;
  END IF;

  -- 10問を追加（display_order 7-16）
  INSERT INTO public.questions
    (question_set_id, question_number, section_name, answer_type,
     correct_answer, unit_label, answer_config, points, display_order)
  VALUES
  -- 数表 (2問)
  (v_qs, '(1)', '数表', 'multi_part', NULL, NULL, '{"slots": [{"label": "①", "unit": ""}, {"label": "②", "unit": ""}, {"label": "③行", "unit": ""}, {"label": "③列", "unit": ""}], "correct_values": {"①": "100", "②": "103", "③行": "13", "③列": "6"}, "template": "①{①}，②{②}，③{③行}行目の{③列}列目"}', 1, 7),
  (v_qs, '(2)', '数表', 'multi_part', NULL, NULL, '{"slots": [{"label": "①", "unit": ""}, {"label": "②", "unit": ""}, {"label": "③", "unit": ""}], "correct_values": {"①": "512", "②": "49", "③": "171"}, "template": "①{①}，②{②}，③{③}"}', 1, 8),
  -- 日暦算 (5問)
  (v_qs, '(1)', '日暦算', 'numeric', '6', '日', NULL, 1, 9),
  (v_qs, '(2)', '日暦算', 'numeric', '3', '日', NULL, 1, 10),
  (v_qs, '(3)', '日暦算', 'selection', NULL, NULL, '{"correct_values": ["木曜日"], "dummy_values": ["月曜日", "火曜日", "水曜日", "金曜日", "土曜日", "日曜日"]}', 1, 11),
  (v_qs, '(4)', '日暦算', 'selection', NULL, NULL, '{"correct_values": ["土曜日"], "dummy_values": ["月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "日曜日"]}', 1, 12),
  (v_qs, '(5)', '日暦算', 'numeric', '2034', '年', NULL, 1, 13),
  -- 規則性の入試問題 (3問)
  (v_qs, '(1)', '規則性の入試問題', 'selection', NULL, NULL, '{"correct_values": ["月曜日"], "dummy_values": ["火曜日", "水曜日", "木曜日", "金曜日", "土曜日", "日曜日"]}', 1, 14),
  (v_qs, '(2)', '規則性の入試問題', 'selection', NULL, NULL, '{"correct_values": ["土曜日"], "dummy_values": ["月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "日曜日"]}', 1, 15),
  (v_qs, '(3)', '規則性の入試問題', 'multi_part', NULL, NULL, '{"slots": [{"label": "①", "unit": ""}, {"label": "②", "unit": ""}, {"label": "③段", "unit": ""}, {"label": "③番", "unit": ""}], "correct_values": {"①": "37", "②": "559", "③段": "13", "③番": "6"}, "template": "①{①}，②{②}，③{③段}段目の{③番}番目"}', 1, 16);

  RAISE NOTICE '小6 第2回②「規則性」に10問を追加しました（display_order 7-16）';
END $$;
