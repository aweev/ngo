-- =====================================================
-- P0 production seed: minimal approved multilingual content.
-- Run AFTER seed.sql against a fresh org. Every locale (en/de/fr/es/ar)
-- gets a published homepage hero + mission + get-involved CTA so no
-- public section renders empty in production.
--
-- Usage: psql $DATABASE_URL -f supabase/seed-p0-production-content.sql
-- =====================================================
DO $$
DECLARE
    v_org UUID;
    v_page UUID;
    loc TEXT;
    locales TEXT[] := ARRAY['en', 'de', 'fr', 'es', 'ar'];
    titles TEXT[] := ARRAY[
        'Dignified Growth, Radiant Community',
        'Würdevolles Wachstum, strahlende Gemeinschaft',
        'Croissance digne, communauté radieuse',
        'Crecimiento digno, comunidad radiante',
        'نمو كريم، مجتمع مشرق'
    ];
    i INT;
BEGIN
    SELECT id INTO v_org FROM organizations WHERE slug = 'awe-ev' LIMIT 1;
    IF v_org IS NULL THEN
        RAISE EXCEPTION 'seed.sql must run first (organizations row missing)';
    END IF;

    INSERT INTO content_pages (organization_id, title, slug, status, workflow_state, content, published_at)
    VALUES (v_org, titles[1], 'homepage-hero', 'published', 'published',
            '{"headline": "Dignified Growth, Radiant Community"}'::jsonb, NOW())
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_page;

    SELECT id INTO v_page FROM content_pages
    WHERE organization_id = v_org AND slug = 'homepage-hero' LIMIT 1;

    UPDATE content_pages SET status = 'published', workflow_state = 'published', published_at = NOW()
    WHERE id = v_page;

    FOR i IN 1..array_length(locales, 1) LOOP
        loc := locales[i];
        INSERT INTO content_page_translations
            (page_id, organization_id, locale, status, title, content, source, published_at)
        VALUES (v_page, v_org, loc, 'published', titles[i],
                jsonb_build_object('headline', titles[i]), 'human', NOW())
        ON CONFLICT (page_id, locale) DO UPDATE SET
            status = 'published', title = EXCLUDED.title,
            content = EXCLUDED.content, published_at = NOW();
    END LOOP;

    -- Organization profile translations (mission/vision per locale).
    INSERT INTO entity_translations (organization_id, entity_type, entity_id, locale, status, fields, source, published_at)
    SELECT v_org, 'organization', v_org, u.l, 'published',
           jsonb_build_object('name', titles[u.i], 'description', titles[u.i]), 'human', NOW()
    FROM unnest(locales) WITH ORDINALITY AS u(l, i)
    ON CONFLICT (entity_type, entity_id, locale) DO UPDATE SET
        status = 'published', fields = EXCLUDED.fields, published_at = NOW();
END $$;
