import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenContainer } from '@shared/components/ScreenContainer';
import {
  ArrowLeft,
  Heart,
  ShoppingCart,
  Sparkles,
  Store,
  ChevronRight,
  Truck,
  ShieldCheck,
  RotateCcw,
  CalendarClock,
  ShoppingBag,
  Plus,
  Minus,
  CheckCircle2,
} from 'lucide-react-native';
import { useBranchStore } from '@modulos/sucursales/almacen/branch.store';
import { useFittingBagStore } from '@modulos/reservas/almacen/fittingBag.store';
import { useCartStore } from '@modulos/carrito/almacen/cart.store';
import { BranchSelectionModal } from '@modulos/sucursales/componentes/BranchSelectionModal';
import { MOCK_PRODUCTS } from '../datos/mockProducts';
import type { ProductItem, ProductVariant } from '../tipos/catalog.types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@app/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ProductDetail'>;

const getClothingImages = (name: string, cat: string): string[] => {
  const n = name.toLowerCase();
  const c = cat.toLowerCase();
  if (n.includes('polera') || n.includes('shirt') || n.includes('camiseta')) {
    return [
      'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&auto=format&fit=crop&q=80',
    ];
  }
  if (n.includes('short') || n.includes('bermuda')) {
    return [
      'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1562157873-818bc0726f68?w=800&auto=format&fit=crop&q=80',
    ];
  }
  if (n.includes('vestido') || c.includes('vestido') || c.includes('gala')) {
    return [
      'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&auto=format&fit=crop&q=80',
    ];
  }
  return [
    'https://images.unsplash.com/photo-1523381294911-8d3cead13475?w=800&auto=format&fit=crop&q=80',
  ];
};

export const ProductDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { productId } = route.params;
  const { activeBranch, openSelectionModal } = useBranchStore();
  const { addItem: addToFittingBag } = useFittingBagStore();
  const { addItem: addToCart, items: cartItems } = useCartStore();

  const cartCount = cartItems.reduce((acc, it) => acc + it.quantity, 0);

  const [product, setProduct] = useState<ProductItem>(() => {
    return MOCK_PRODUCTS.find((p) => p.id === productId) || MOCK_PRODUCTS[0];
  });

  useEffect(() => {
    const local = MOCK_PRODUCTS.find((p) => p.id === productId);
    if (local) {
      setProduct(local);
      return;
    }

    (async () => {
      try {
        const rawId = String(productId).replace('back-', '');
        const { apiClient } = await import('@shared/api/apiClient');
        const res = await apiClient.get<any>(`/productos/${rawId}`);
        const p = res.data?.data || res.data;
        if (p && p.id) {
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

          const catName = p.categoria?.nombre || 'General';
          const defaultImages = getClothingImages(p.nombre, catName);

          setProduct({
            id: `back-${p.id}`,
            name: p.nombre,
            description: p.descripcion || '',
            category:
              catName.toUpperCase().includes('DEPORTIV') || p.nombre.toLowerCase().includes('short')
                ? 'PANTS'
                : 'SHIRTS',
            categoryLabel: catName,
            season: 'SPRING_SUMMER',
            seasonLabel: 'Colección 2026',
            basePrice: Number(p.precio) || 0,
            rating: 4.9,
            hasArTryOn: false,
            images: p.imagenUrl ? [p.imagenUrl] : defaultImages,
            variants,
            branchStocks,
          });
        }
      } catch {
        // Fallback
      }
    })();
  }, [productId]);

  // Extrae tallas únicas disponibles
  const availableSizes = useMemo(() => {
    const set = new Set<string>();
    product.variants.forEach((v) => {
      if (v.sizeName) set.add(v.sizeName);
    });
    return Array.from(set);
  }, [product.variants]);

  // Extrae colores únicos disponibles
  const availableColors = useMemo(() => {
    const map = new Map<string, { colorName: string; colorHex: string }>();
    product.variants.forEach((v) => {
      if (v.colorHex && !map.has(v.colorHex)) {
        map.set(v.colorHex, { colorName: v.colorName, colorHex: v.colorHex });
      }
    });
    return Array.from(map.values());
  }, [product.variants]);

  const [selectedSize, setSelectedSize] = useState<string>(
    availableSizes[0] || 'M'
  );
  const [selectedColorHex, setSelectedColorHex] = useState<string>(
    availableColors[0]?.colorHex || product.variants[0]?.colorHex || '#333333'
  );
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [actionToast, setActionToast] = useState<string | null>(null);

  // Variante activa basada en talla y color seleccionados
  const selectedVariant: ProductVariant = useMemo(() => {
    return (
      product.variants.find(
        (v) => v.sizeName === selectedSize && v.colorHex === selectedColorHex
      ) ||
      product.variants.find((v) => v.sizeName === selectedSize) ||
      product.variants[0] || {
        id: `var-${product.id}-default`,
        sku: `SKU-${product.id}`,
        barcode: `777000${product.id}`,
        sizeName: selectedSize,
        colorName: 'Predeterminado',
        colorHex: selectedColorHex,
        price: product.basePrice,
        availableStock: 10,
      }
    );
  }, [product.variants, selectedSize, selectedColorHex, product.basePrice, product.id]);

  // Stock en la sucursal seleccionada
  const stockInBranch =
    product.branchStocks?.[activeBranch.id] ??
    product.branchStocks?.[`branch-${activeBranch.id}`] ??
    product.branchStocks?.['1'] ??
    10;
  const isAvailableInBranch = stockInBranch > 0;

  const showToast = (message: string) => {
    setActionToast(message);
    setTimeout(() => {
      setActionToast(null);
    }, 2200);
  };

  const handleAddToFitting = () => {
    const result = addToFittingBag({
      id: `fit-${Date.now()}`,
      productId: product.id,
      productName: product.name,
      variantId: selectedVariant.id,
      sku: selectedVariant.sku,
      sizeName: selectedSize,
      colorName: selectedVariant.colorName,
      colorHex: selectedVariant.colorHex,
      price: selectedVariant.price,
      imageUrl: product.images[0],
    });

    if (!result.success) {
      Alert.alert('Límite del Probador', result.message);
    } else {
      showToast(`¡${product.name} agregada a tu Bolsa de Probador!`);
    }
  };

  const handleAddToCart = () => {
    addToCart({
      productId: product.id,
      variantId: selectedVariant.id,
      name: product.name,
      sizeName: selectedSize,
      colorName: selectedVariant.colorName,
      colorHex: selectedVariant.colorHex,
      price: selectedVariant.price,
      quantity: quantity,
      imageUrl: product.images[0],
    });

    showToast(`¡${quantity}x ${product.name} añadida(s) a tu bolsa!`);
  };

  const handleBuyNow = () => {
    addToCart({
      productId: product.id,
      variantId: selectedVariant.id,
      name: product.name,
      sizeName: selectedSize,
      colorName: selectedVariant.colorName,
      colorHex: selectedVariant.colorHex,
      price: selectedVariant.price,
      quantity: quantity,
      imageUrl: product.images[0],
    });

    navigation.navigate('Checkout');
  };

  return (
    <ScreenContainer className="bg-white flex-1" style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Toast Flotante */}
      {actionToast && (
        <View
          style={{
            position: 'absolute',
            top: 50,
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
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>{actionToast}</Text>
        </View>
      )}

      {/* Barra Superior */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 12,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottomWidth: 1,
          borderBottomColor: '#F1F5F9',
          backgroundColor: '#FFFFFF',
        }}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{
            padding: 8,
            backgroundColor: '#F8FAFC',
            borderWidth: 1,
            borderColor: '#E2E8F0',
            borderRadius: 12,
          }}
          activeOpacity={0.7}
        >
          <ArrowLeft size={18} color="#0F172A" />
        </TouchableOpacity>

        <Text style={{ fontSize: 12, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {product.categoryLabel}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => setIsFavorite(!isFavorite)}
            style={{
              padding: 8,
              backgroundColor: '#F8FAFC',
              borderWidth: 1,
              borderColor: '#E2E8F0',
              borderRadius: 12,
              marginRight: 8,
            }}
            activeOpacity={0.7}
          >
            <Heart size={18} color={isFavorite ? '#DC2626' : '#64748B'} fill={isFavorite ? '#DC2626' : 'none'} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('MainTabs', { screen: 'CartTab' })}
            style={{
              padding: 8,
              backgroundColor: '#F8FAFC',
              borderWidth: 1,
              borderColor: '#E2E8F0',
              borderRadius: 12,
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

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {/* Imagen Principal */}
        <View style={{ position: 'relative', width: '100%', height: 360, backgroundColor: '#F1F5F9' }}>
          <Image
            source={{ uri: product.images[selectedImageIndex] || product.images[0] }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />

          {/* Galería de Miniaturas */}
          {product.images.length > 1 && (
            <View style={{ position: 'absolute', bottom: 12, left: 16, flexDirection: 'row' }}>
              {product.images.map((img, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => setSelectedImageIndex(idx)}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    borderWidth: 2,
                    borderColor: selectedImageIndex === idx ? '#FFFFFF' : 'rgba(255,255,255,0.4)',
                    overflow: 'hidden',
                    marginRight: 8,
                    elevation: 3,
                  }}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: img }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Contenido Principal */}
        <View style={{ padding: 20 }}>
          {/* Título y Precio */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={{ fontSize: 22, fontWeight: '900', color: '#0F172A' }}>{product.name}</Text>
              <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '500', marginTop: 2 }}>
                SKU: {selectedVariant.sku}
              </Text>
            </View>

            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 24, fontWeight: '900', color: '#0F172A' }}>
                Bs. {selectedVariant.price.toFixed(2)}
              </Text>
              <View style={{ backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginTop: 4 }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#059669' }}>IVA Incluido</Text>
              </View>
            </View>
          </View>

          {/* BANNER PROBADOR VIRTUAL AR (SOLO SI LA PRENDA ESTÁ HABILITADA PARA AR) */}
          {product.hasArTryOn && (
            <TouchableOpacity
              onPress={() => navigation.navigate('VirtualTryOn', { productId: product.id })}
              activeOpacity={0.9}
              style={{
                marginTop: 18,
                padding: 16,
                backgroundColor: '#0F172A',
                borderRadius: 20,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderWidth: 1,
                borderColor: '#1E293B',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 10 }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    backgroundColor: '#7C3AED',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Sparkles size={20} color="#FFFFFF" />
                </View>
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '900', color: '#FFFFFF' }}>
                    Pruébate esta prenda en vivo
                  </Text>
                  <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 2, lineHeight: 15 }}>
                    Realidad Aumentada con tu cámara frontal
                  </Text>
                </View>
              </View>

              <View style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 }}>
                <Text style={{ fontSize: 11, fontWeight: '900', color: '#0F172A' }}>Probar AR</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Tarjeta de Disponibilidad en Sucursal Física */}
          <View
            style={{
              marginTop: 18,
              padding: 14,
              backgroundColor: '#F8FAFC',
              borderWidth: 1,
              borderColor: '#E2E8F0',
              borderRadius: 18,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 8 }}>
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  backgroundColor: isAvailableInBranch ? '#ECFDF5' : '#FEF2F2',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 10,
                }}
              >
                <Store size={18} color={isAvailableInBranch ? '#059669' : '#DC2626'} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#0F172A' }}>
                  {activeBranch.name}
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '600',
                    color: isAvailableInBranch ? '#059669' : '#DC2626',
                    marginTop: 1,
                  }}
                >
                  {isAvailableInBranch
                    ? `✓ ${stockInBranch} unidades en tienda`
                    : 'Agotado en esta sucursal'}
                </Text>
              </View>
            </View>

            {/* Botón Cambiar Sucursal Limpio y Visible */}
            <TouchableOpacity
              onPress={openSelectionModal}
              style={{
                backgroundColor: '#EFF6FF',
                borderWidth: 1,
                borderColor: '#BFDBFE',
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 10,
                flexDirection: 'row',
                alignItems: 'center',
              }}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#1D4ED8', marginRight: 2 }}>Cambiar</Text>
              <ChevronRight size={12} color="#1D4ED8" />
            </TouchableOpacity>
          </View>

          {/* Selector de Tallas (Diseño Ordenado y Sin Texto Roto) */}
          <View style={{ marginTop: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#0F172A', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Talla: <Text style={{ color: '#2563EB' }}>{selectedSize}</Text>
              </Text>
              <Text style={{ fontSize: 11, color: '#64748B' }}>Guía de tallas</Text>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {availableSizes.map((size) => {
                const isSelected = selectedSize === size;
                return (
                  <TouchableOpacity
                    key={size}
                    onPress={() => setSelectedSize(size)}
                    activeOpacity={0.8}
                    style={{
                      minWidth: 48,
                      height: 44,
                      paddingHorizontal: 14,
                      borderRadius: 12,
                      borderWidth: isSelected ? 2 : 1,
                      borderColor: isSelected ? '#0F172A' : '#E2E8F0',
                      backgroundColor: isSelected ? '#0F172A' : '#FFFFFF',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 8,
                      marginBottom: 8,
                      elevation: isSelected ? 2 : 0,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '800',
                        color: isSelected ? '#FFFFFF' : '#0F172A',
                      }}
                    >
                      {size}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Selector de Colores (Diseño Limpio con Nombre de Color) */}
          <View style={{ marginTop: 14 }}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#0F172A', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
              Color: <Text style={{ color: '#2563EB' }}>{selectedVariant.colorName}</Text>
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
              {availableColors.map((c) => {
                const isSelected = selectedColorHex === c.colorHex;
                return (
                  <TouchableOpacity
                    key={c.colorHex}
                    onPress={() => setSelectedColorHex(c.colorHex)}
                    activeOpacity={0.8}
                    style={{
                      padding: 3,
                      borderRadius: 20,
                      borderWidth: 2,
                      borderColor: isSelected ? '#0F172A' : 'transparent',
                      marginRight: 10,
                      marginBottom: 8,
                    }}
                  >
                    <View
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 15,
                        backgroundColor: c.colorHex,
                        borderWidth: 1,
                        borderColor: '#CBD5E1',
                      }}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Selector de Cantidad */}
          <View style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9' }}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#0F172A', textTransform: 'uppercase' }}>
              Cantidad a Comprar
            </Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', padding: 2 }}>
              <TouchableOpacity
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
                style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}
              >
                <Minus size={14} color="#0F172A" />
              </TouchableOpacity>

              <Text style={{ fontSize: 14, fontWeight: '900', color: '#0F172A', paddingHorizontal: 12 }}>
                {quantity}
              </Text>

              <TouchableOpacity
                onPress={() => setQuantity(quantity + 1)}
                style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}
              >
                <Plus size={14} color="#0F172A" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Detalles & Composición */}
          <View style={{ marginTop: 22, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#0F172A', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
              Detalles & Composición
            </Text>
            <Text style={{ fontSize: 12, color: '#64748B', lineHeight: 18 }}>
              {product.description ||
                'Prenda de alta durabilidad confeccionada con tejidos seleccionados de algodón peinado y fibras elásticas de recuperación térmica para máxima comodidad.'}
            </Text>

            {/* Garantías del E-commerce */}
            <View style={{ marginTop: 14, backgroundColor: '#F8FAFC', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Truck size={14} color="#2563EB" />
                <Text style={{ fontSize: 11, color: '#475569', marginLeft: 8 }}>
                  Despacho express a domicilio o retiro gratuito en tienda física
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <ShieldCheck size={14} color="#059669" />
                <Text style={{ fontSize: 11, color: '#475569', marginLeft: 8 }}>
                  Garantía de confección original y certificación textil
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <RotateCcw size={14} color="#64748B" />
                <Text style={{ fontSize: 11, color: '#475569', marginLeft: 8 }}>
                  Cambios de talla gratuitos dentro de los 7 días
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* BARRA INFERIOR FIJA DE COMPRA Y RESERVA (Siempre visible y nunca tapada) */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: Math.max(insets.bottom, 16) + 6,
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#F1F5F9',
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.08,
          shadowRadius: 6,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {/* Botón Reservar en Probador Físico */}
          <TouchableOpacity
            onPress={handleAddToFitting}
            activeOpacity={0.85}
            style={{
              paddingVertical: 13,
              paddingHorizontal: 14,
              backgroundColor: '#F1F5F9',
              borderWidth: 1,
              borderColor: '#E2E8F0',
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              marginRight: 8,
            }}
          >
            <CalendarClock size={16} color="#0F172A" />
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#0F172A', marginLeft: 6 }}>
              Bolsa de Prueba
            </Text>
          </TouchableOpacity>

          {/* Botón Añadir a la Bolsa */}
          <TouchableOpacity
            onPress={handleAddToCart}
            activeOpacity={0.85}
            style={{
              flex: 1,
              paddingVertical: 13,
              paddingHorizontal: 10,
              backgroundColor: '#0F172A',
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              marginRight: 8,
            }}
          >
            <ShoppingBag size={16} color="#FFFFFF" />
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#FFFFFF', marginLeft: 6 }}>
              Añadir a Bolsa
            </Text>
          </TouchableOpacity>

          {/* Botón Comprar Directo */}
          <TouchableOpacity
            onPress={handleBuyNow}
            activeOpacity={0.85}
            style={{
              flex: 1,
              paddingVertical: 13,
              paddingHorizontal: 10,
              backgroundColor: '#2563EB',
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              elevation: 2,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '900', color: '#FFFFFF' }}>
              Comprar Ya
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal de Selección de Sucursales */}
      <BranchSelectionModal />
    </ScreenContainer>
  );
};
