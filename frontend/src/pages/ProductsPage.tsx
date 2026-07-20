import type { FormEvent } from 'react';
import type { Product } from '../types/models';
import type { ProductFilter } from '../types/app';
import { Badge } from '../components/Badge';
import { foodCategories } from '../lib/constants';
import { money } from '../lib/format';
import { productStatus } from '../lib/stock';

type ProductsPageProps = {
  products: Product[];
  editingProductId: string | null;
  searchQuery: string;
  productFilter: ProductFilter;
  onSearchChange: (value: string) => void;
  onFilterChange: (value: ProductFilter) => void;
  onSubmit: (form: HTMLFormElement) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onCancelEdit: () => void;
};

export function ProductsPage({
  products,
  editingProductId,
  searchQuery,
  productFilter,
  onSearchChange,
  onFilterChange,
  onSubmit,
  onEdit,
  onDelete,
  onCancelEdit,
}: ProductsPageProps) {
  const editingProduct = editingProductId ? products.find((product) => product.id === editingProductId) : null;
  const filtered = products.filter((product) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery = !q || product.name.toLowerCase().includes(q) || (product.category ?? '').toLowerCase().includes(q) || (product.barcode ?? '').toLowerCase().includes(q);
    const matchesFilter =
      productFilter === 'all' ||
      (productFilter === 'critical' && product.quantity <= product.minQuantity) ||
      (productFilter === 'low' && product.quantity <= product.minQuantity * 2 && product.quantity > product.minQuantity) ||
      (productFilter === 'out' && product.quantity === 0);
    return matchesQuery && matchesFilter;
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(event.currentTarget);
  }

  return (
    <>
      <section className="panel catalog-toolbar">
        <div><p className="eyebrow">Catalogo</p><h3>Cadastro de produtos por setor</h3></div>
        <div className="catalog-metrics">
          <div><span>Itens filtrados</span><strong>{filtered.length}</strong></div>
          <div><span>Alertas</span><strong>{products.filter((product) => product.quantity <= product.minQuantity).length}</strong></div>
          <div><span>Categorias</span><strong>{new Set(products.map((product) => product.category ?? 'Sem categoria')).size}</strong></div>
        </div>
      </section>

      <section className="content-grid product-layout">
        <article className="panel">
          <div className="section-head"><div><p className="eyebrow">{editingProduct ? 'Edicao' : 'Novo item'}</p><h3>{editingProduct ? 'Atualizar produto' : 'Cadastrar produto'}</h3></div></div>
          <form className="form-grid product-form" onSubmit={handleSubmit}>
            <input type="hidden" name="productId" value={editingProduct?.id ?? ''} />
            <label>Nome do produto<input name="name" required minLength={3} defaultValue={editingProduct?.name ?? ''} /></label>
            <label>Categoria<select name="category" defaultValue={editingProduct?.category ?? ''}>
              <option value="">Selecione a categoria</option>
              {foodCategories.map((category) => <option value={category.value} key={category.value}>{category.value}</option>)}
            </select></label>
            <label>Unidade<select name="unit" defaultValue={editingProduct?.unit ?? 'un'}>
              {['un', 'kg', 'l', 'cx', 'dz'].map((unit) => <option value={unit} key={unit}>{unit}</option>)}
            </select></label>
            <label>Codigo de barras<input name="barcode" defaultValue={editingProduct?.barcode ?? ''} /></label>
            <input type="hidden" name="imageUrl" value={editingProduct?.imageUrl ?? ''} />
            <label>Quantidade<input name="quantity" type="number" min="0" required defaultValue={editingProduct?.quantity ?? 0} /></label>
            <label>Estoque minimo<input name="minQuantity" type="number" min="0" required defaultValue={editingProduct?.minQuantity ?? 0} /></label>
            <label>Valor unitario<input name="price" type="number" min="0" step="0.01" required defaultValue={editingProduct?.price ?? 0} /></label>
            <div className="inline-actions">
              <button type="submit" className="primary">{editingProduct ? 'Salvar alteracoes' : 'Cadastrar produto'}</button>
              {editingProduct && <button type="button" onClick={onCancelEdit}>Cancelar</button>}
            </div>
          </form>
        </article>

        <article className="panel">
          <div className="section-head search-section">
            <div><p className="eyebrow">Consulta</p><h3>Produtos cadastrados</h3></div>
            <div className="search-bar">
              <input placeholder="Buscar produto, categoria ou codigo" value={searchQuery} onChange={(event) => onSearchChange(event.target.value)} />
              <select value={productFilter} onChange={(event) => onFilterChange(event.target.value as ProductFilter)}>
                <option value="all">Todos</option><option value="critical">Criticos</option><option value="low">Baixo estoque</option><option value="out">Zerados</option>
              </select>
            </div>
          </div>

          <div className="product-list">
            {filtered.length > 0 ? filtered.map((product) => {
              const status = productStatus(product);
              return (
                <article className="product-card" key={product.id}>
                  <div className="product-card-top">
                    {product.imageUrl ? <img src={product.imageUrl} alt="" className="product-thumb" /> : <div className="product-thumb fallback-thumb">{(product.name[0] ?? 'P').toUpperCase()}</div>}
                    <div className="product-main">
                      <div className="row-between"><strong>{product.name}</strong><Badge label={status.label} tone={status.className} /></div>
                      <p>{product.category ?? 'Sem categoria'} - {product.barcode ?? 'Sem codigo'}</p>
                    </div>
                  </div>
                  <div className="product-meta">
                    <span>Qtd: <strong>{product.quantity}</strong></span><span>Min: <strong>{product.minQuantity}</strong></span><span>Un: <strong>{product.unit ?? '-'}</strong></span><span>Valor: <strong>{money(product.price)}</strong></span>
                  </div>
                  <div className="actions"><button type="button" onClick={() => onEdit(product.id)}>Editar</button><button type="button" onClick={() => onDelete(product.id)} className="danger">Excluir</button></div>
                </article>
              );
            }) : <p className="empty">Nenhum produto real encontrado. Cadastre um item para iniciar o controle do estoque.</p>}
          </div>
        </article>
      </section>
    </>
  );
}
