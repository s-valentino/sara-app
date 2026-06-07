# Sara Valentino — App PWA

App installabile su telefono per il brand Sara Valentino.

## Setup rapido

### 1. Supabase — crea le tabelle

Nel progetto Supabase esistente (qnhnsjqzheyiacfmmmbe), esegui questo SQL:

```sql
-- Risposte utenti
CREATE TABLE sara_user_answers (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  answer_key  TEXT NOT NULL,
  answer_text TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, answer_key)
);

-- Prodotti sbloccati
CREATE TABLE sara_user_products (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id   TEXT NOT NULL,
  unlocked_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- Codici di sblocco
CREATE TABLE sara_unlock_codes (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code       TEXT NOT NULL UNIQUE,
  product_id TEXT NOT NULL,
  used       BOOLEAN DEFAULT FALSE,
  used_by    UUID REFERENCES auth.users(id),
  used_at    TIMESTAMPTZ
);

-- RLS
ALTER TABLE sara_user_answers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE sara_user_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sara_unlock_codes  ENABLE ROW LEVEL SECURITY;

-- Policies risposte
CREATE POLICY "Utenti vedono le proprie risposte"
  ON sara_user_answers FOR ALL USING (auth.uid() = user_id);

-- Policies prodotti
CREATE POLICY "Utenti vedono i propri prodotti"
  ON sara_user_products FOR ALL USING (auth.uid() = user_id);

-- Policies codici
CREATE POLICY "Codici leggibili da utenti autenticati"
  ON sara_unlock_codes FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Codici aggiornabili da utenti autenticati"
  ON sara_unlock_codes FOR UPDATE USING (auth.role() = 'authenticated');

-- GRANTS
GRANT ALL ON sara_user_answers  TO authenticated;
GRANT ALL ON sara_user_products TO authenticated;
GRANT ALL ON sara_unlock_codes  TO authenticated;
```

### 2. Inserisci la tua Anon Key

In `app.js`, riga 8, sostituisci:
```
const SUPABASE_ANON = 'SOSTITUISCI_CON_ANON_KEY';
```
con la tua anon key dal pannello Supabase (Settings → API).

### 3. Crea le icone

Crea una cartella `icons/` con:
- `icon-192.png` — 192×192px
- `icon-512.png` — 512×512px

Font: S in Cormorant Garamond italic, terracotta #c4614a su sfondo #0e0b09.

### 4. Deploy su GitHub Pages

1. Crea nuovo repository `sara-app` sull'account `s-valentino`
2. Carica tutti i file con drag-and-drop
3. Settings → Pages → Branch: main → Save
4. App disponibile su: `https://s-valentino.github.io/sara-app/`

## Aggiungere prodotti futuri

In `app.js`, aggiungi un oggetto al array `PRODUCTS` seguendo la struttura esistente:

```js
{
  id: 'nome-prodotto',
  title: 'Titolo prodotto',
  titleItalic: 'parola',       // parola in corsivo nel titolo
  eyebrow: 'Workbook',
  description: 'Descrizione breve.',
  free: false,                  // true = accesso diretto, false = richiede codice
  sections: [
    {
      title: 'Titolo sezione',
      intro: 'Testo introduttivo...',
      questions: [
        { text: 'Domanda?', hint: 'Esempio...' }
      ]
    }
  ]
}
```

## Generare codici sblocco

Dalla console Supabase o con uno script:
```sql
INSERT INTO sara_unlock_codes (code, product_id)
VALUES
  ('SARA-P001', 'nome-prodotto'),
  ('SARA-P002', 'nome-prodotto'),
  ...
```
