// Wikidata の P18（画像）から Wikimedia Commons の実写真 URL を実行時に取得する。
// 画像が無い駅は null を返す（プレースホルダを捏造しない）。

const cache = new Map<string, string | null>();

interface EntityData {
  entities?: Record<
    string,
    {
      claims?: {
        P18?: {
          mainsnak?: { datavalue?: { value?: string } };
        }[];
      };
    }
  >;
}

/** Commons のファイル名 → 実 URL（幅指定で軽量化）。 */
function filePathUrl(filename: string, width = 800): string {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(
    filename
  )}?width=${width}`;
}

/**
 * Wikidata Q番号から駅の代表画像 URL を返す。無い / 取得失敗時は null。
 * 結果はメモリキャッシュ（同一セッションで再取得しない）。
 */
export async function stationImageUrl(
  wikidata: string,
  signal?: AbortSignal
): Promise<string | null> {
  const id = wikidata.trim();
  if (!/^Q\d+$/.test(id)) return null;
  if (cache.has(id)) return cache.get(id)!;

  try {
    const res = await fetch(
      `https://www.wikidata.org/wiki/Special:EntityData/${id}.json`,
      { signal }
    );
    if (!res.ok) throw new Error(`wikidata ${res.status}`);
    const data = (await res.json()) as EntityData;
    const filename =
      data.entities?.[id]?.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
    const url = filename ? filePathUrl(filename) : null;
    cache.set(id, url);
    return url;
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    cache.set(id, null);
    return null;
  }
}
