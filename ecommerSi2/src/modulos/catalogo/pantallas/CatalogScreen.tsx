import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  StatusBar,
} from 'react-native';
import { ScreenContainer } from '@shared/components/ScreenContainer';
import {
  Search,
  Sparkles,
  ShoppingCart,
  CheckCircle2,
  AlertCircle,
  Camera,
  X,
  Plus,
} from 'lucide-react-native';
import { BranchHeaderSelector } from '@modulos/sucursales/componentes/BranchHeaderSelector';
import { useBranchStore } from '@modulos/sucursales/almacen/branch.store';
import { useCartStore } from '@modulos/carrito/almacen/cart.store';
import { MOCK_PRODUCTS } from '../datos/mockProducts';
import type { ProductItem } from '../tipos/catalog.types';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabParamList, RootStackParamList } from '@app/navigation/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<BottomTabParamList, 'CatalogTab'>,
  NativeStackScreenProps<RootStackParamList>
>;

const CATEGORIES = [
  { key: 'ALL', label: 'Todo el Catálogo', icon: '✨' },
  { key: 'ROPA_CASUAL', label: 'Ropa Casual', icon: '👕' },
  { key: 'ROPA_GALA', label: 'Ropa de Gala', icon: '👔' },
  { key: 'ROPA_DEPORTIVA', label: 'Ropa Deportiva', icon: '🏃' },
  { key: 'AR_MODELS', label: 'Probador RA', icon: '🪞' },
];

const getClothingImages = (name: string, cat: string): string[] => {
  const n = name.toLowerCase();
  const c = cat.toLowerCase();
  if (n.includes('camisa')) {
    return [
      'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&auto=format&fit=crop&q=80',
    ];
  }
  if (n.includes('pantalón') || n.includes('pantalon')) {
    return [
      'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800&auto=format&fit=crop&q=80',
    ];
  }
  if (n.includes('corbata')) {
    return [
      'https://images.unsplash.com/photo-1589756823695-278bc923f962?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800&auto=format&fit=crop&q=80',
    ];
  }
  if (n.includes('short') || n.includes('bermuda')) {
    return [
      'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1562157873-818bc0726f68?w=800&auto=format&fit=crop&q=80',
    ];
  }
  if (n.includes('polera') || n.includes('shirt') || n.includes('camiseta')) {
    return [
      'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=800&auto=format&fit=crop&q=80',
    ];
  }
  return [
    'https://images.unsplash.com/photo-1523381294911-8d3cead13475?w=800&auto=format&fit=crop&q=80',
  ];
};

export const CatalogScreen: React.FC<Props> = ({ navigation }) => {
  const { activeBranch } = useBranchStore();
  const { items: cartItems, addItem: addToCart } = useCartStore();
  const cartCount = cartItems.reduce((acc, it) => acc + it.quantity, 0);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [sortBy, setSortBy] = useState<'POPULAR' | 'PRICE_ASC' | 'PRICE_DESC'>('POPULAR');
  // Inicializar únicamente con las prendas de RA autorizadas (sin mockups que no existan en DB)
  const [products, setProducts] = useState<ProductItem[]>(() => {
    return MOCK_PRODUCTS.filter((p) => p.hasArTryOn === true);
  });
  const [addedToast, setAddedToast] = useState<string | null>(null);

  // Carga productos reales del backend conectada a la base de datos + únicamente prendas con RA
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const { apiClient } = await import('@shared/api/apiClient');
        const res = await apiClient.get<any>('/productos');
        if (res.data && Array.isArray(res.data.data) && res.data.data.length > 0 && isMounted) {
          const remoteItems: ProductItem[] = res.data.data.map((p: any) => {
            const branchStocks: Record<string, number> = { '1': 0, '2': 0 };
            const variants = (p.variantes || []).map((v: any) => {
              const vStock = (v.inventarios || []).reduce(
                (acc: number, inv: any) => acc + (inv.cantidadFisica || 0),
                0
              );
              (v.inventarios || []).forEach((inv: any) => {
                const bKey = String(inv.sucursalId || '1');
                branchStocks[bKey] = (branchStocks[bKey] || 0) + (inv.cantidadFisica || 0);
              });

              return {
                id: String(v.id),
                sku: v.sku || `SKU-${v.id}`,
                barcode: `777000${v.id}`,
                sizeName: v.talla?.nombre || 'M',
                colorName: v.color?.nombre || 'Default',
                colorHex: v.color?.codigoHex || '#333333',
                price: Number(p.precio) || 0,
                availableStock: vStock,
              };
            });

            const catName = p.categoria?.nombre || 'Ropa Casual';
            const catUpper = catName.toUpperCase();
            let mappedCatKey = 'ROPA_CASUAL';
            if (catUpper.includes('GALA')) {
              mappedCatKey = 'ROPA_GALA';
            } else if (catUpper.includes('DEPORTIV') || p.nombre.toLowerCase().includes('short')) {
              mappedCatKey = 'ROPA_DEPORTIVA';
            }

            const defaultImages = getClothingImages(p.nombre, catName);

            return {
              id: `back-${p.id}`,
              name: p.nombre,
              description: p.descripcion || `Prenda de alta calidad de ${catName}, disponible en tienda y online.`,
              category: mappedCatKey,
              categoryLabel: catName,
              season: 'SPRING_SUMMER',
              seasonLabel: 'Colección 2026',
              basePrice: Number(p.precio) || 0,
              rating: 4.9,
              hasArTryOn: false, // Las prendas normales de backend no tienen modelo AR
              images: p.imagenUrl ? [p.imagenUrl] : defaultImages,
              variants,
              branchStocks,
            };
          });

          // Solo las prendas que tienen modelo de Realidad Aumentada habilitado
          const arMockItems = MOCK_PRODUCTS.filter((p) => p.hasArTryOn === true);
          setProducts([...remoteItems, ...arMockItems]);
        }
      } catch (err: any) {
        console.log('Catálogo backend conectado:', err?.message);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const getProductBranchStock = (product: ProductItem, branchId: string): number => {
    if (!product.branchStocks) return 10;
    return (
      product.branchStocks[branchId] ??
      product.branchStocks[`branch-${branchId}`] ??
      product.branchStocks['1'] ??
      product.branchStocks['branch-1'] ??
      10
    );
  };

  const filteredProducts = useMemo(() => {
    let list = products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory =
        selectedCategory === 'ALL' ||
        (selectedCategory === 'AR_MODELS' && p.hasArTryOn) ||
        p.category === selectedCategory ||
        (selectedCategory === 'ROPA_CASUAL' && (p.categoryLabel || '').toLowerCase().includes('casual')) ||
        (selectedCategory === 'ROPA_GALA' && (p.categoryLabel || '').toLowerCase().includes('gala')) ||
        (selectedCategory === 'ROPA_DEPORTIVA' && (p.categoryLabel || '').toLowerCase().includes('deportiv'));
      const branchStock = getProductBranchStock(p, activeBranch.id);
      const matchesStock = !onlyInStock || branchStock > 0;

      return matchesSearch && matchesCategory && matchesStock;
    });

    if (sortBy === 'PRICE_ASC') {
      list.sort((a, b) => a.basePrice - b.basePrice);
    } else if (sortBy === 'PRICE_DESC') {
      list.sort((a, b) => b.basePrice - a.basePrice);
    }

    return list;
  }, [products, searchTerm, selectedCategory, onlyInStock, sortBy, activeBranch.id]);

  const handleQuickAdd = (product: ProductItem) => {
    const variant = product.variants[0] || {
      id: `var-${product.id}-default`,
      sku: `SKU-${product.id}`,
      sizeName: 'M',
      colorName: 'Predeterminado',
      colorHex: '#1E293B',
      price: product.basePrice,
      availableStock: 10,
    };

    addToCart({
      productId: product.id,
      variantId: variant.id,
      name: product.name,
      sizeName: variant.sizeName,
      colorName: variant.colorName,
      colorHex: variant.colorHex,
      price: variant.price,
      quantity: 1,
      imageUrl: product.images[0],
    });

    setAddedToast(`¡${product.name} añadido a tu bolsa!`);
    setTimeout(() => {
      setAddedToast(null);
    }, 2000);
  };

  const renderProductItem = ({ item }: { item: ProductItem }) => {
    const stockInBranch = getProductBranchStock(item, activeBranch.id);
    const isAvailable = stockInBranch > 0;

    return (
      <View
        style={{
          flex: 1,
          margin: 6,
          backgroundColor: '#FFFFFF',
          borderRadius: 20,
          borderWidth: 1,
          borderColor: '#E2E8F0',
          overflow: 'hidden',
          elevation: 2,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
        }}
      >
        {/* Imagen del Producto */}
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
          style={{ position: 'relative', width: '100%', height: 180, backgroundColor: '#F1F5F9' }}
        >
          <Image
            source={{ uri: item.images[0] }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />

          {/* Badge AR SOLO en las prendas que tienen modelo AR */}
          {item.hasArTryOn && (
            <TouchableOpacity
              onPress={() => navigation.navigate('VirtualTryOn', { productId: item.id })}
              activeOpacity={0.8}
              style={{
                position: 'absolute',
                top: 8,
                left: 8,
                backgroundColor: '#7C3AED',
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 20,
                flexDirection: 'row',
                alignItems: 'center',
                shadowColor: '#7C3AED',
                shadowOpacity: 0.3,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <Sparkles size={11} color="#FFFFFF" />
              <Text style={{ fontSize: 9, fontWeight: '900', color: '#FFFFFF', marginLeft: 4, letterSpacing: 0.5 }}>
                PROBAR AR
              </Text>
            </TouchableOpacity>
          )}

          {/* Badge Disponibilidad en Sucursal */}
          <View
            style={{
              position: 'absolute',
              bottom: 8,
              left: 8,
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 12,
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: isAvailable ? 'rgba(15, 23, 42, 0.88)' : 'rgba(71, 85, 105, 0.88)',
            }}
          >
            {isAvailable ? (
              <>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#34D399', marginRight: 5 }} />
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#FFFFFF' }}>{stockInBranch} en tienda</Text>
              </>
            ) : (
              <>
                <AlertCircle size={10} color="#FCA5A5" style={{ marginRight: 4 }} />
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#FFFFFF' }}>Agotado local</Text>
              </>
            )}
          </View>
        </TouchableOpacity>

        {/* Información de Prenda */}
        <View style={{ padding: 12 }}>
          <Text style={{ fontSize: 10, fontWeight: '800', color: '#2563EB', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {item.categoryLabel}
          </Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
          >
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A', marginTop: 2 }} numberOfLines={1}>
              {item.name}
            </Text>
          </TouchableOpacity>

          {/* Muestras de Colores */}
          {item.variants && item.variants.length > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
              {item.variants.slice(0, 3).map((v, i) => (
                <View
                  key={i}
                  style={{
                    backgroundColor: v.colorHex || '#333333',
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    borderWidth: 1,
                    borderColor: '#CBD5E1',
                    marginRight: 4,
                  }}
                />
              ))}
              {item.variants.length > 3 && (
                <Text style={{ fontSize: 10, color: '#64748B', fontWeight: '600' }}>+{item.variants.length - 3}</Text>
              )}
            </View>
          )}

          {/* Precios y Botón Rápido */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, color: '#64748B', fontWeight: '500' }}>Precio</Text>
              <Text style={{ fontSize: 14, fontWeight: '900', color: '#0F172A' }}>
                Bs. {item.basePrice.toFixed(2)}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => handleQuickAdd(item)}
              activeOpacity={0.7}
              style={{
                width: 34,
                height: 34,
                borderRadius: 12,
                backgroundColor: '#0F172A',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              accessibilityLabel="Añadir a la bolsa"
            >
              <Plus size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <ScreenContainer className="bg-gray-50 flex-1" style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Toast flotante de adición al carrito */}
      {addedToast && (
        <View
          style={{
            position: 'absolute',
            top: 60,
            left: 20,
            right: 20,
            zIndex: 99,
            backgroundColor: '#0F172A',
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 14,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            elevation: 8,
          }}
        >
          <CheckCircle2 size={16} color="#34D399" style={{ marginRight: 8 }} />
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>{addedToast}</Text>
        </View>
      )}

      {/* Grid de Productos con Header integrado */}
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {/* Barra Superior con Selector de Sucursal y Carrito */}
            <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <BranchHeaderSelector />
                <TouchableOpacity
                  onPress={() => navigation.navigate('MainTabs', { screen: 'CartTab' })}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    backgroundColor: '#F8FAFC',
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                  }}
                  activeOpacity={0.7}
                >
                  <ShoppingCart size={18} color="#0F172A" />
                  {cartCount > 0 && (
                    <View
                      style={{
                        position: 'absolute',
                        top: -4,
                        right: -4,
                        backgroundColor: '#2563EB',
                        borderRadius: 10,
                        width: 18,
                        height: 18,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 9, fontWeight: '900', color: '#FFFFFF' }}>{cartCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Banner Principal de Novedades y Probador AR */}
            <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
              <View
                style={{
                  backgroundColor: '#0B0F19',
                  borderRadius: 22,
                  padding: 18,
                  borderWidth: 1,
                  borderColor: '#1E293B',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Badge AR Experiencia 3D */}
                <View
                  style={{
                    position: 'absolute',
                    top: 14,
                    right: 14,
                    backgroundColor: 'rgba(124, 58, 237, 0.25)',
                    borderColor: '#A855F7',
                    borderWidth: 1,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 20,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  <Sparkles size={11} color="#E9D5FF" />
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#F3E8FF', marginLeft: 4, letterSpacing: 0.5 }}>
                    EXPERIENCIA AR 3D
                  </Text>
                </View>

                <Text style={{ fontSize: 11, fontWeight: '800', color: '#60A5FA', textTransform: 'uppercase', letterSpacing: 1 }}>
                  Nueva Temporada 2026
                </Text>
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#FFFFFF', marginTop: 4, maxWidth: 220, lineHeight: 23 }}>
                  Pruébate la ropa con tu cámara en vivo
                </Text>
                <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 4, maxWidth: 240, lineHeight: 15 }}>
                  Realidad Aumentada con ajuste anatómico de hombros y cintura.
                </Text>

                <View style={{ flexDirection: 'row', marginTop: 14 }}>
                  <TouchableOpacity
                    onPress={() => {
                      const arProduct = products.find((p) => p.hasArTryOn) || products[0];
                      navigation.navigate('VirtualTryOn', { productId: arProduct.id });
                    }}
                    style={{
                      backgroundColor: '#FFFFFF',
                      paddingHorizontal: 16,
                      paddingVertical: 9,
                      borderRadius: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      elevation: 2,
                    }}
                    activeOpacity={0.85}
                  >
                    <Camera size={14} color="#0F172A" />
                    <Text style={{ fontSize: 12, fontWeight: '900', color: '#0F172A', marginLeft: 6 }}>Probar con AR</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Buscador de Prendas */}
            <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  borderRadius: 16,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                }}
              >
                <Search size={16} color="#64748B" />
                <TextInput
                  value={searchTerm}
                  onChangeText={setSearchTerm}
                  placeholder="Buscar poleras, shorts, ropa casual..."
                  style={{ flex: 1, marginLeft: 10, fontSize: 13, color: '#0F172A', paddingVertical: 0 }}
                  placeholderTextColor="#94A3B8"
                />
                {searchTerm.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchTerm('')} style={{ padding: 2 }}>
                    <X size={14} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Categorías Horizontales con Iconos (Diseño limpio y no roto) */}
            <FlatList
              data={CATEGORIES}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.key}
              style={{ marginTop: 2, marginBottom: 8 }}
              contentContainerStyle={{ paddingHorizontal: 16 }}
              renderItem={({ item }) => {
                const isSelected = selectedCategory === item.key;
                return (
                  <TouchableOpacity
                    onPress={() => setSelectedCategory(item.key)}
                    activeOpacity={0.7}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      marginRight: 8,
                      borderRadius: 14,
                      backgroundColor: isSelected ? '#0F172A' : '#FFFFFF',
                      borderWidth: 1,
                      borderColor: isSelected ? '#0F172A' : '#E2E8F0',
                      elevation: isSelected ? 2 : 0,
                    }}
                  >
                    <Text style={{ fontSize: 13 }}>{item.icon}</Text>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '700',
                        color: isSelected ? '#FFFFFF' : '#334155',
                        marginLeft: 6,
                      }}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />

            {/* Barra de Filtros de Stock y Orden */}
            <View
              style={{
                paddingHorizontal: 16,
                paddingVertical: 10,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#FFFFFF',
                borderTopWidth: 1,
                borderBottomWidth: 1,
                borderColor: '#F1F5F9',
                marginBottom: 6,
              }}
            >
              <TouchableOpacity
                onPress={() => setOnlyInStock(!onlyInStock)}
                activeOpacity={0.7}
                style={{ flexDirection: 'row', alignItems: 'center' }}
              >
                <View
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 5,
                    borderWidth: 1.5,
                    borderColor: onlyInStock ? '#2563EB' : '#CBD5E1',
                    backgroundColor: onlyInStock ? '#2563EB' : '#FFFFFF',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 8,
                  }}
                >
                  {onlyInStock && <CheckCircle2 size={12} color="#FFFFFF" />}
                </View>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B' }}>
                  Solo en {activeBranch.name.split(' ')[0]}
                </Text>
              </TouchableOpacity>

              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity
                  onPress={() => {
                    if (sortBy === 'POPULAR') setSortBy('PRICE_ASC');
                    else if (sortBy === 'PRICE_ASC') setSortBy('PRICE_DESC');
                    else setSortBy('POPULAR');
                  }}
                  style={{ flexDirection: 'row', alignItems: 'center', padding: 4 }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#2563EB', marginRight: 4 }}>
                    {sortBy === 'POPULAR'
                      ? 'Populares'
                      : sortBy === 'PRICE_ASC'
                      ? 'Menor Precio'
                      : 'Mayor Precio'}
                  </Text>
                  <Text style={{ fontSize: 10, color: '#64748B' }}>({filteredProducts.length})</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        }
        renderItem={renderProductItem}
      />
    </ScreenContainer>
  );
};
