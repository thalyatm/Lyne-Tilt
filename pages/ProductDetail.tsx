import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PRODUCTS } from '../constants';
import { Truck, RefreshCw, ShieldCheck, Plus, Minus } from 'lucide-react';

const AccordionItem = ({ title, children, isOpen, onClick }: any) => (
  <div className="border-b border-stone-200">
    <button 
      className="w-full py-5 flex justify-between items-center text-left group outline-none"
      onClick={onClick}
    >
      <span className="font-serif text-stone-800 text-lg group-hover:text-clay transition-colors">{title}</span>
      {isOpen ? <Minus size={16} className="text-clay" /> : <Plus size={16} className="text-stone-400 group-hover:text-clay transition-colors" />}
    </button>
    <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isOpen ? 'max-h-96 opacity-100 mb-6' : 'max-h-0 opacity-0'}`}>
      <div className="text-sm text-stone-600 leading-relaxed pr-4">
        {children}
      </div>
    </div>
  </div>
);

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const product = PRODUCTS.find(p => p.id === id) || PRODUCTS[0];
  const [openSection, setOpenSection] = useState<string | null>('description');

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  return (
    <div className="pt-32 pb-24 px-6 max-w-7xl mx-auto">
      {/* Breadcrumbs */}
      <div className="mb-10 text-[10px] uppercase tracking-[0.2em] text-stone-400">
        <Link to="/" className="hover:text-stone-800 transition-colors">Home</Link> 
        <span className="mx-2">/</span>
        <Link to="/shop" className="hover:text-stone-800 transition-colors">Shop</Link> 
        <span className="mx-2">/</span>
        <span className="text-stone-800">{product.category}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20">
        {/* Gallery (Left 7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="aspect-[4/5] bg-stone-100 overflow-hidden">
            <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
          </div>
          {product.detailImages.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {product.detailImages.map((img, idx) => (
                <div key={idx} className="aspect-square bg-stone-100 overflow-hidden cursor-zoom-in">
                  <img src={img} alt={`${product.name} detail`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info (Right 5 cols) */}
        <div className="lg:col-span-5 lg:sticky lg:top-32 h-fit">
          <h1 className="text-3xl md:text-5xl font-serif text-stone-900 mb-3">{product.name}</h1>
          <p className="text-xl font-light text-stone-500 mb-8">${product.price}</p>
          
          <p className="italic text-lg text-stone-600 mb-8 font-serif border-l-2 border-clay pl-6 py-1">
            {product.shortDescription}
          </p>

          <button className="w-full bg-stone-900 text-white py-5 uppercase tracking-[0.2em] text-xs font-bold hover:bg-clay transition-colors mb-10 shadow-sm hover:shadow-md">
            Add to Cart
          </button>

          {/* Accordions */}
          <div className="border-t border-stone-200">
            <AccordionItem 
              title="The Story" 
              isOpen={openSection === 'description'} 
              onClick={() => toggleSection('description')}
            >
              {product.longDescription}
            </AccordionItem>

            <AccordionItem 
              title="Materials & Care" 
              isOpen={openSection === 'materials'} 
              onClick={() => toggleSection('materials')}
            >
              <p>Handcrafted with intention using ethically sourced materials. To maintain the unique finish of your piece, avoid direct contact with perfumes, lotions, and water. Store in a dry place when not in use.</p>
            </AccordionItem>

            <AccordionItem 
              title="Shipping & Returns" 
              isOpen={openSection === 'shipping'} 
              onClick={() => toggleSection('shipping')}
            >
              <ul className="space-y-3">
                <li className="flex items-center gap-3"><Truck size={16} className="text-stone-400" /> Free shipping within Australia (1-3 days).</li>
                <li className="flex items-center gap-3"><Truck size={16} className="text-stone-400" /> International shipping available via DHL.</li>
                <li className="flex items-center gap-3"><RefreshCw size={16} className="text-stone-400" /> 14-day change of mind returns.</li>
              </ul>
            </AccordionItem>
          </div>
          
          <div className="mt-10 pt-6 border-t border-stone-100 text-center">
            <p className="text-xs text-stone-400 flex items-center justify-center gap-2 uppercase tracking-widest">
               <ShieldCheck size={14} /> Handmade in Melbourne
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;