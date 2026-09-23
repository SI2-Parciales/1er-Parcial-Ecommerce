import React, { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { ScreenContainer } from '@shared/components/ScreenContainer';
import { ArrowLeft, Sparkles, Share2 } from 'lucide-react-native';
import { useBranchStore } from '@modulos/sucursales/almacen/branch.store';
import { useFittingBagStore } from '@modulos/reservas/almacen/fittingBag.store';
import { useCartStore } from '@modulos/carrito/almacen/cart.store';
import { MOCK_PRODUCTS } from '../datos/mockProducts';
import type { ProductItem } from '../tipos/catalog.types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@app/navigation/types';
import { InsigniaDisponibilidadSucursal } from '../componentes/InsigniaDisponibilidadSucursal';
import { SelectorVariantesPrenda } from '../componentes/SelectorVariantesPrenda';
import { BarraAccionesDetalle } from '../componentes/BarraAccionesDetalle';

type Props = NativeStackScreenProps<RootStackParamList, 'ProductDetail'>;

export const ProductDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { productId } = route.params;
  const { activeBranch } = useBranchStore();
  const { addItem: addToFittingBag } = useFittingBagStore();
  const { addItem: addToCart } = useCartStore();

  const [product, setProduct] = useState<ProductItem>(() => {
    return MOCK_PRODUCTS.find(p => p.id === productId) || MOCK_PRODUCTS[0];
  });
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const numId = parseInt(productId, 10);
    if (!isNaN(numId)) {
      (async () => {
        try {
          const { apiClient } = await import('@shared/api/apiClient');
          const res = await apiClient.get<any>(`/productos/${numId}`);
          if (res.data && res.data.id && isMounted) {
            const p = res.data;
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

            const catName = (p.categoria?.nombre || '').toLowerCase();
            const prodName = (p.nombre || '').toLowerCase();
            const isTorso =
              prodName.includes('polera') ||
              prodName.includes('camiseta') ||
              prodName.includes('crop') ||
              prodName.includes('blusa') ||
              prodName.includes('shirt') ||
              catName.includes('polera') ||
              catName.includes('camisa');
            const isWaist =
              prodName.includes('short') ||
              prodName.includes('pantalon') ||
              prodName.includes('bermuda') ||
              catName.includes('short') ||
              catName.includes('pantalon') ||
              catName.includes('deportiv');

            const hasArTryOn = isTorso || isWaist;
            const arGarmentType: 'SHIRT' | 'SHORTS' = isWaist ? 'SHORTS' : 'SHIRT';
            const targetRegion: 'TORSO' | 'WAIST' = isWaist ? 'WAIST' : 'TORSO';

            const mapped: ProductItem = {
              id: String(p.id),
              name: p.nombre,
              description: p.descripcion || '',
              category: (p.categoria?.nombre || '').toUpperCase().includes('DEPORTIV')
                ? 'PANTS'
                : (p.categoria?.nombre || '').toUpperCase().includes('GALA')
                ? 'DRESSES'
                : 'SHIRTS',
              categoryLabel: p.categoria?.nombre || 'General',
              season: 'SPRING_SUMMER',
              seasonLabel: 'Colección 2026',
              basePrice: Number(p.precio) || 0,
              rating: 4.9,
              hasArTryOn,
              arGarmentType,
              targetRegion,
              images: p.imagenUrl
                ? [p.imagenUrl]
                : [
                    'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop&q=60',
                    'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=500&auto=format&fit=crop&q=60',
                  ],
              variants,
              branchStocks,
            };
            setProduct(mapped);
          }
        } catch {
          // Fallback a producto local
        }
      })();
    }
    return () => {
      isMounted = false;
    };
  }, [productId]);

  const selectedVariant = product.variants[selectedVariantIndex] || product.variants[0];
  const stockInBranch = product.branchStocks[activeBranch.id] ?? product.branchStocks['branch-' + activeBranch.id] ?? 10;

  const handleAddToFitting = () => {
    const result = addToFittingBag({
      id: `fit-${Date.now()}`,
      productId: product.id,
      productName: product.name,
      variantId: selectedVariant.id,
      sku: selectedVariant.sku,
      sizeName: selectedVariant.sizeName,
      colorName: selectedVariant.colorName,
      colorHex: selectedVariant.colorHex,
      price: selectedVariant.price,
      imageUrl: product.images[0],
    });

    if (!result.success) {
      Alert.alert('Límite Alcanzado', result.message);
    } else {
      Alert.alert(
        '¡Prenda Agregada al Probador!',
        `Se añadió ${product.name} (${selectedVariant.sizeName}) a tu bolsa de prueba.`,
        [
          { text: 'Seguir mirando', style: 'cancel' },
          { text: 'Ir al Probador', onPress: () => navigation.navigate('FittingBag') },
        ]
      );
    }
  };

  const handleAddToCart = () => {
    addToCart({
      productId: product.id,
      variantId: selectedVariant.id,
      name: product.name,
      sizeName: selectedVariant.sizeName,
      colorName: selectedVariant.colorName,
      colorHex: selectedVariant.colorHex,
      price: selectedVariant.price,
      quantity: 1,
      imageUrl: product.images[0],
    });

    Alert.alert('Bolsa de Compras', 'Prenda agregada a tu bolsa.');
  };

  return (
    <ScreenContainer className="bg-white">
      {/* Top Navigation Bar */}
      <View className="px-4 py-3 flex-row justify-between items-center border-b border-gray-100 bg-white">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="p-2 bg-gray-100 rounded-full"
        >
          <ArrowLeft size={20} color="#111827" />
        </TouchableOpacity>
        <Text className="text-sm font-bold text-gray-900" numberOfLines={1}>
          Detalle de Prenda
        </Text>
        <TouchableOpacity className="p-2 bg-gray-100 rounded-full">
          <Share2 size={18} color="#4B5563" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} className="flex-1">
        {/* Product Image */}
        <View className="relative bg-gray-100">
          <Image
            source={{ uri: product.images[0] }}
            className="w-full h-80 bg-gray-100"
            resizeMode="cover"
          />
          {product.hasArTryOn && (
            <TouchableOpacity
              onPress={() => navigation.navigate('VirtualTryOn', { productId: product.id })}
              activeOpacity={0.85}
              className="absolute bottom-4 right-4 bg-purple-600 px-4 py-2.5 rounded-full flex-row items-center gap-2 shadow-lg shadow-purple-600/40"
            >
              <Sparkles size={16} color="#FFFFFF" />
              <Text className="text-xs font-bold text-white">
                Probar en AR (Cámara)
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Content */}
        <View className="p-5">
          <View className="flex-row justify-between items-start">
            <View className="flex-1 pr-2">
              <Text className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                {product.categoryLabel} • {product.seasonLabel}
              </Text>
              <Text className="text-xl font-black text-gray-900 mt-1">
                {product.name}
              </Text>
            </View>
            <Text className="text-xl font-black text-gray-900">
              Bs. {selectedVariant.price.toFixed(2)}
            </Text>
          </View>

          {/* Banner de Probador AR Estilo Instagram */}
          {product.hasArTryOn && (
            <TouchableOpacity
              onPress={() => navigation.navigate('VirtualTryOn', { productId: product.id })}
              activeOpacity={0.9}
              className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-2xl flex-row items-center justify-between shadow-xs"
            >
              <View className="flex-row items-center gap-2.5 flex-1 pr-2">
                <View className="w-9 h-9 rounded-xl bg-purple-600 items-center justify-center">
                  <Sparkles size={18} color="#FFFFFF" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-bold text-purple-950">
                    Pruébate esta prenda en vivo
                  </Text>
                  <Text className="text-[10px] text-purple-700 mt-0.5">
                    Filtro AR con cámara frontal y ajuste corporal IA
                  </Text>
                </View>
              </View>
              <View className="bg-purple-600 px-3 py-1.5 rounded-full">
                <Text className="text-white text-[11px] font-bold">Probar</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Description */}
          <Text className="text-xs text-gray-600 leading-relaxed mt-3">
            {product.description}
          </Text>

          {/* Branch Availability Banner Component */}
          <InsigniaDisponibilidadSucursal
            branchName={activeBranch.name}
            stockInBranch={stockInBranch}
          />

          {/* Variantes: Colores y Tallas Component */}
          <SelectorVariantesPrenda
            variants={product.variants}
            selectedVariantIndex={selectedVariantIndex}
            onSelectVariant={setSelectedVariantIndex}
          />
        </View>
      </ScrollView>

      {/* Sticky Bottom Actions Component */}
      <BarraAccionesDetalle
        onAddToFitting={handleAddToFitting}
        onAddToCart={handleAddToCart}
      />
    </ScreenContainer>
  );
};
