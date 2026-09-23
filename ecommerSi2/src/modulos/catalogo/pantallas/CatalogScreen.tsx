import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Image } from 'react-native';
import { ScreenContainer } from '@shared/components/ScreenContainer';
import { Search, SlidersHorizontal, Sparkles, Eye, CheckCircle2, AlertCircle } from 'lucide-react-native';
import { BranchHeaderSelector } from '@modulos/sucursales/componentes/BranchHeaderSelector';
import { BranchSelectionModal } from '@modulos/sucursales/componentes/BranchSelectionModal';
import { useBranchStore } from '@modulos/sucursales/almacen/branch.store';
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

/**
 * Categorías de filtro superior para segmentar el catálogo
 */
const CATEGORIES = [
  { key: 'ALL', label: 'Todo' },
  { key: 'DRESSES', label: 'Vestidos' },
  { key: 'JACKETS', label: 'Chaquetas' },
  { key: 'SHIRTS', label: 'Camisas' },
  { key: 'PANTS', label: 'Pantalones' },
  { key: 'FOOTWEAR', label: 'Calzado' },
  { key: 'ACCESSORIES', label: 'Accesorios' },
];

/**
 * ============================================================================
 * PANTALLA PRINCIPAL DE CATÁLOGO (CatalogScreen)
 * ============================================================================
 * Muestra el catálogo de prendas disponibles en la tienda.
 * 
 * Características:
 * 1. Selector de Tienda en la barra superior (sucursal activa con GPS).
 * 2. Carga en tiempo real desde el backend NestJS (GET /productos).
 * 3. Búsqueda instantánea por nombre o descripción de prenda.
 * 4. Filtro por categorías (vestidos, camisas, pantalones, etc.).
 * 5. Filtro de disponibilidad local (solo prendas con stock en la tienda elegida).
 * ============================================================================
 */
export const CatalogScreen: React.FC<Props> = ({ navigation }) => {
  // Sucursal seleccionada por el usuario desde useBranchStore
  const { activeBranch } = useBranchStore();

  // Estados locales para los filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [products, setProducts] = useState<ProductItem[]>(MOCK_PRODUCTS);

  // Al montar la pantalla, consulta los productos reales del backend NestJS
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

            return {
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
          });
          setProducts(remoteItems);
        }
      } catch {
        // Fallback a MOCK_PRODUCTS ya cargados
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

  const filteredProducts = products.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
    const branchStock = getProductBranchStock(p, activeBranch.id);
    const matchesStock = !onlyInStock || branchStock > 0;

    return matchesSearch && matchesCategory && matchesStock;
  });

  const renderProductCard = ({ item }: { item: ProductItem }) => {
    const stockInBranch = getProductBranchStock(item, activeBranch.id);
    const isAvailable = stockInBranch > 0;

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
        className="flex-1 m-1.5 bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-xs"
      >
        <View className="relative">
          <Image
            source={{ uri: item.images[0] }}
            className="w-full h-44 bg-gray-100"
            resizeMode="cover"
          />
          {item.hasArTryOn && (
            <View className="absolute top-2 left-2 bg-purple-600/90 px-2 py-0.5 rounded-full flex-row items-center gap-1">
              <Sparkles size={10} color="#FFFFFF" />
              <Text className="text-[10px] font-bold text-white">AR 3D</Text>
            </View>
          )}

          <View className={`absolute bottom-2 left-2 px-2 py-0.5 rounded-full flex-row items-center gap-1 ${
            isAvailable ? 'bg-emerald-600/90' : 'bg-gray-800/80'
          }`}>
            {isAvailable ? (
              <>
                <CheckCircle2 size={10} color="#FFFFFF" />
                <Text className="text-[9px] font-bold text-white">{stockInBranch} en tienda</Text>
              </>
            ) : (
              <>
                <AlertCircle size={10} color="#FFFFFF" />
                <Text className="text-[9px] font-bold text-white">Agotado local</Text>
              </>
            )}
          </View>
        </View>

        <View className="p-3">
          <Text className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
            {item.categoryLabel}
          </Text>
          <Text className="text-xs font-bold text-gray-900 mt-0.5" numberOfLines={1}>
            {item.name}
          </Text>
          <Text className="text-sm font-black text-gray-900 mt-1">
            Bs. {item.basePrice.toFixed(2)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenContainer className="bg-gray-50/50 flex-1" style={{ flex: 1 }}>
      {/* Top Bar with Branch Selector */}
      <View className="px-4 pt-2 pb-3 bg-white border-b border-gray-100 flex-row justify-between items-center">
        <View>
          <Text className="text-xs font-bold text-blue-600 tracking-wider uppercase">
            Catálogo Retail
          </Text>
          <Text className="text-lg font-black text-gray-900">
            Prendas Exclusivas
          </Text>
        </View>
        <BranchHeaderSelector />
      </View>

      {/* Search and Filters Bar */}
      <View className="p-4 bg-white border-b border-gray-100">
        <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
          <Search size={16} color="#9CA3AF" />
          <TextInput
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholder="Buscar por prenda, estilo o tejido..."
            className="flex-1 ml-2 text-xs text-gray-900"
          />
        </View>

        {/* Categories Chips */}
        <FlatList
          data={CATEGORIES}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.key}
          style={{ marginTop: 12, marginBottom: 4 }}
          contentContainerStyle={{ paddingHorizontal: 2 }}
          renderItem={({ item }) => {
            const isSelected = selectedCategory === item.key;
            return (
              <TouchableOpacity
                onPress={() => setSelectedCategory(item.key)}
                activeOpacity={0.7}
                className={`px-3 py-1.5 rounded-full mr-2 border ${
                  isSelected ? 'bg-blue-600 border-blue-600' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <Text className={`text-xs font-semibold ${isSelected ? 'text-white' : 'text-gray-600'}`}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />

        {/* Switch Only in Branch Stock */}
        <TouchableOpacity
          onPress={() => setOnlyInStock(!onlyInStock)}
          activeOpacity={0.7}
          className="flex-row items-center justify-between mt-3 pt-2 border-t border-gray-100"
        >
          <Text className="text-xs font-medium text-gray-600">
            Mostrar solo con existencias en {activeBranch.name}
          </Text>
          <View className={`w-10 h-5 rounded-full p-0.5 justify-center ${
            onlyInStock ? 'bg-blue-600 items-end' : 'bg-gray-300 items-start'
          }`}>
            <View className="w-4 h-4 rounded-full bg-white shadow-xs" />
          </View>
        </TouchableOpacity>
      </View>

      {/* Product Grid */}
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        numColumns={2}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 10, paddingBottom: 60 }}
        renderItem={renderProductCard}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="p-8 items-center justify-center">
            <Text className="text-sm font-semibold text-gray-500 text-center">
              No se encontraron prendas que coincidan con la búsqueda o stock de la tienda.
            </Text>
          </View>
        }
      />

      {/* Global Branch Modal */}
      <BranchSelectionModal />
    </ScreenContainer>
  );
};
