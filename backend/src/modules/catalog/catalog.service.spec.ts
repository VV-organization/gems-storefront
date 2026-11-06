import { describe, expect, it } from "vitest";

import { CatalogService } from "./catalog.service";

type QueryResult<Row> = { rows: Row[] };

const appleRow = {
  id: "apple-ru-500",
  slug: "apple-ru-500",
  kind: "apple_gift_card",
  category: "Подарочная карта Apple",
  game: null,
  product_type: "Подарочная карта App Store & iTunes",
  title: "Подарочная карта Apple",
  description: "Пополняйте баланс Apple ID подарочной картой App Store & iTunes. Код вручную отправит команда Gems после оплаты.",
  price_coin_minor: 75000,
  effective_price_coin_minor: "75000",
  availability: "available",
  fulfillment_mode: "manual",
  created_at: new Date("2026-08-12T15:45:35.355Z"),
  popularity: 100,
  image: null,
  image_alt: null,
  meta: ["Россия", "500 RUB"],
  keywords: ["apple", "itunes", "подарочная карта"],
  details: {
    specifications: [
      { label: "Регион", value: "Россия" },
      { label: "Номинал", value: "500 RUB" },
    ],
    fulfillment: {
      title: "Ручная выдача",
      description: "Код вручную отправит команда Gems после оплаты.",
      requirements: ["Регион Apple ID должен соответствовать выбранной карте."],
    },
    appleGiftCard: {
      currency: "RUB",
      nominalMinor: 50000,
      regionCode: "RU",
      regionLabel: "Россия",
    },
  },
  supplier_price_microusd: null,
};

describe("CatalogService", () => {
  it("bounds preview IDs before loading full product documents", async () => {
    let sql='';
    const service=new CatalogService({query:(query:string)=>{sql=query;return Promise.resolve({rows:[]});}} as never);
    await service.preview({game:'cs2',status:'available',max:'20000',sort:'price_desc',limit:'6'});
    expect(sql).toContain('WITH preview_products AS MATERIALIZED');
    expect(sql.indexOf('LIMIT')).toBeLessThan(sql.indexOf('catalog_products.description'));
    expect(sql).toContain('JOIN preview_products ON preview_products.id = catalog_products.id');
  });

  it("loads comparison weapon names independently of product pages", async () => {
    let sql='';
    const service=new CatalogService({query:(query:string)=>{sql=query;return Promise.resolve({rows:[{weapon:'AK-47'},{weapon:'Glock-18'}]});}} as never);
    expect(await service.comparisonWeapons()).toEqual({weapons:['AK-47','Glock-18']});
    expect(sql).toContain('SELECT DISTINCT weapon');
    expect(sql).toContain("lower(game) = 'cs2'");
    expect(sql).toContain('public_enabled = true');
    expect(sql).not.toContain('supplier_listings');
  });

  it("applies weapon, price and pagination filters to previews without facets", async () => {
    const calls:{sql:string;params:unknown[]}[]=[];
    const service=new CatalogService({query:(sql:string,params:unknown[])=>{calls.push({sql,params});return Promise.resolve({rows:[]});}} as never);
    const query={game:'cs2',weapon:'AK-47',max:'10000',sort:'price_desc',offset:'60',limit:'60',status:'available'};
    await service.preview(query);
    expect(calls).toHaveLength(1);
    const call=calls[0];
    if(!call)throw new Error('Expected preview query');
    expect(call.params).toContain('AK-47');
    expect(call.params).toContain(1000000);
    expect(call.params.slice(-2)).toEqual([60,60]);
    expect(call.sql).toContain('DESC, catalog_products.id ASC');
    expect(call.sql).not.toContain('count(*)');
  });
  it("loads previews without full catalog counts or facets", async () => {
    const queries:string[]=[];
    const service=new CatalogService({query:(sql:string)=>{queries.push(sql);return Promise.resolve({rows:[]});}} as never);
    expect(await service.preview({game:'cs2',categoryId:'knife',status:'available',limit:'3'})).toEqual({items:[]});
    expect(queries).toHaveLength(1);
    expect(queries[0]).toContain('available_quantity > 0');
    expect(queries[0]).not.toContain('SELECT DISTINCT');
    expect(queries[0]).not.toContain('count(*)');
  });

  it("counts unfiltered categories without joining supplier prices", async () => {
    const queries:string[]=[];
    const service=new CatalogService({query:(sql:string)=>{queries.push(sql);return Promise.resolve({rows:[]});}} as never);
    await service.list({game:'cs2'});
    expect(queries.find(sql=>sql.includes('AS total'))).not.toContain('JOIN supplier_listings');
  });
  function createService(row: Omit<typeof appleRow, "game"> & { game: string | null } = appleRow) {
    const database = {
      query<Row>(sql: string): Promise<QueryResult<Row>> {
        const isConstrainedToSkins = sql.includes("catalog_products.kind = 'skins'");

        if (sql.includes("SELECT count(*)::text AS total")) {
          return Promise.resolve({ rows: [{ total: isConstrainedToSkins ? "0" : "1" }] as Row[] });
        }

        if (sql.includes("SELECT DISTINCT") || sql.includes("jsonb_array_elements")) {
          return Promise.resolve({ rows: [] });
        }

        if (sql.includes("catalog_products.id")) {
          return Promise.resolve({ rows: (isConstrainedToSkins ? [] : [row]) as Row[] });
        }

        return Promise.resolve({ rows: [] });
      },
    };

    return new CatalogService(database as never);
  }

  it("reports whole matching catalog counts independently of the selected category and page", async () => {
    const service = new CatalogService({query: (sql: string) => Promise.resolve({rows: sql.includes("AS total")
      ? [{category_id:"rifle",total:"81"},{category_id:"knife",total:"4"},{category_id:"other",total:"2"}]
      : []})} as never);
    const result = await service.list({categoryId:"knife",limit:"1",offset:"2"});
    expect(result).toMatchObject({categoryCounts:{all:87,byCategory:{rifle:81,knife:4,other:2}},pagination:{total:4,limit:1,offset:2}});
  });

  it("returns zero category counts for the excluded Steam catalog", async () => {
    expect(await createService().list({category:"steam"})).toMatchObject({categoryCounts:{all:0,byCategory:{}}});
  });

  it("keeps the default public catalog constrained to skins", async () => {
    const service = createService();

    const result = await service.list({ q: "apple" });

    expect(result.items).toHaveLength(0);
    expect(result.pagination.total).toBe(0);
  });

  it("does not expose Apple even with explicit category", async () => {
    const result = await createService().list({category: "apple_gift_card"});
    expect(result.items).toEqual([]);
    await expect(createService().getBySlug("apple-ru-500")).rejects.toThrow("Product not found");
  });

  it("does not expose Steam refill as public catalog products because Steam uses direct RUB payment", async () => {
    const service = createService({
      ...appleRow,
      id: "steam-top-up-500",
      slug: "steam-top-up-500-rub",
      kind: "steam",
      category: "Steam",
      game: "Steam",
      product_type: "Пополнение баланса",
      title: "Пополнение Steam на 500 RUB",
      description: "Пополнение кошелька Steam на 500 RUB по курсу Gems.",
      price_coin_minor: 75_000,
      effective_price_coin_minor: "75000",
      fulfillment_mode: "automatic",
      meta: ["Steam", "500 RUB"],
      keywords: ["steam", "пополнение"],
      details: {
        ...appleRow.details,
        specifications: [{ label: "Зачисление в Steam", value: "500 RUB" }],
        fulfillment: {
          title: "Данные пополнения Steam",
          description: "Логин Steam фиксируется в заказе.",
          requirements: ["Проверьте логин Steam перед оформлением."],
        },
      },
    });

    const result = await service.list({ category: "steam", q: "steam" });

    expect(result.items).toEqual([]);
    expect(result.pagination.total).toBe(0);
  });

  it("does not resolve legacy dynamic Steam refill slugs as product detail pages", async () => {
    const service = createService();

    await expect(service.getBySlug("steam-top-up-750-rub")).rejects.toMatchObject({
      message: "Product not found",
    });
  });


});
