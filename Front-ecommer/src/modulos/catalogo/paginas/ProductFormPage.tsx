import { useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { catalogService } from '../servicios/catalog.service';
import { productFormSchema, type ProductFormValues } from '../esquemas/product.schema';
import { VariantMatrixGenerator } from '../componentes/VariantMatrixGenerator';
import { Asset3DUploader } from '../componentes/Asset3DUploader';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';

export function ProductFormPage() {
 const { id } = useParams<{ id: string }>();
 const isEdit = Boolean(id);
 const navigate = useNavigate();
 const queryClient = useQueryClient();

 const methods = useForm<ProductFormValues>({
 resolver: zodResolver(productFormSchema),
 defaultValues: {
 name: '',
 description: '',
 category: 'SHIRTS',
 collection: '',
 season: 'SPRING_SUMMER',
 providerId: '',
 basePrice: 0,
 images: [],
 variants: [],
 }
 });

 const { data: sizes = [] } = useQuery({ queryKey: ['catalog', 'sizes'], queryFn: catalogService.getSizes });
 const { data: colors = [] } = useQuery({ queryKey: ['catalog', 'colors'], queryFn: catalogService.getColors });
 const { data: providers = [] } = useQuery({ queryKey: ['catalog', 'providers'], queryFn: catalogService.getProviders });

 const { data: product, isLoading: isLoadingProduct } = useQuery({
 queryKey: ['catalog', 'products', id],
 queryFn: () => catalogService.getProductById(id!),
 enabled: isEdit,
 });

 useEffect(() => {
 if (product && isEdit) {
 methods.reset({
 name: product.name,
 description: product.description,
 category: product.category,
 collection: product.collection,
 season: product.season,
 providerId: product.providerId,
 basePrice: product.basePrice,
 images: product.images,
 asset3D: product.asset3D ? {
 modelUrl: product.asset3D.modelUrl,
 fileSizeBytes: product.asset3D.fileSizeBytes,
 scaleFactor: product.asset3D.scaleFactor,
 } : undefined,
 variants: product.variants.map(v => ({
 id: v.id,
 sizeId: v.size.id,
 colorId: v.color.id,
 sku: v.sku,
 barcode: v.barcode,
 price: v.price,
 costPrice: v.costPrice,
 isActive: v.isActive,
 })),
 });
 }
 }, [product, isEdit, methods]);

 const mutation = useMutation({
 mutationFn: (data: ProductFormValues) => isEdit ? catalogService.updateProduct(id!, data) : catalogService.createProduct(data),
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['catalog', 'products'] });
 navigate('/catalog');
 },
 });

 const onSubmit = (data: ProductFormValues) => {
 mutation.mutate(data);
 };

 if (isEdit && isLoadingProduct) {
 return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
 }

 return (
 <div className="max-w-5xl mx-auto space-y-6">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-4">
 <button onClick={() => navigate('/catalog')} className="p-2 bg-white rounded-md border border-gray-200 hover:bg-gray-50 ">
 <ArrowLeft className="w-4 h-4" />
 </button>
 <h1 className="text-2xl font-bold text-foreground">
 {isEdit ? 'Editar Prenda' : 'Nueva Prenda'}
 </h1>
 </div>
 
 <button
 onClick={methods.handleSubmit(onSubmit)}
 disabled={mutation.isPending}
 className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
 >
 {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
 Guardar Prenda
 </button>
 </div>

 <FormProvider {...methods}>
 <form className="space-y-8" onSubmit={methods.handleSubmit(onSubmit)}>
 
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 <div className="md:col-span-2 space-y-6">
 {/* Información General */}
 <div className="bg-white p-6 rounded-md shadow-sm border border-gray-200 space-y-4">
 <h3 className="text-lg font-medium mb-4 border-b pb-2 ">Información General</h3>
 
 <div>
 <label className="block text-sm font-medium mb-1">Nombre de la Prenda</label>
 <input {...methods.register('name')} className="w-full text-sm border-gray-300 rounded-md px-3 py-2" />
 {methods.formState.errors.name && <p className="text-red-500 text-xs mt-1">{methods.formState.errors.name.message}</p>}
 </div>
 
 <div>
 <label className="block text-sm font-medium mb-1">Descripción</label>
 <textarea {...methods.register('description')} rows={3} className="w-full text-sm border-gray-300 rounded-md px-3 py-2" />
 {methods.formState.errors.description && <p className="text-red-500 text-xs mt-1">{methods.formState.errors.description.message}</p>}
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium mb-1">Colección</label>
 <input {...methods.register('collection')} className="w-full text-sm border-gray-300 rounded-md px-3 py-2" />
 {methods.formState.errors.collection && <p className="text-red-500 text-xs mt-1">{methods.formState.errors.collection.message}</p>}
 </div>
 <div>
 <label className="block text-sm font-medium mb-1">Precio Base</label>
 <input type="number" step="0.01" {...methods.register('basePrice', { valueAsNumber: true })} className="w-full text-sm border-gray-300 rounded-md px-3 py-2" />
 {methods.formState.errors.basePrice && <p className="text-red-500 text-xs mt-1">{methods.formState.errors.basePrice.message}</p>}
 </div>
 </div>
 </div>

 {/* Matriz de Variantes */}
 <VariantMatrixGenerator availableSizes={sizes} availableColors={colors} />
 
 {/* Multimedia */}
 <Asset3DUploader />
 </div>

 <div className="space-y-6">
 {/* Taxonomía */}
 <div className="bg-white p-6 rounded-md shadow-sm border border-gray-200 space-y-4">
 <h3 className="text-lg font-medium mb-4 border-b pb-2 ">Taxonomía</h3>
 
 <div>
 <label className="block text-sm font-medium mb-1">Categoría</label>
 <select {...methods.register('category')} className="w-full text-sm border-gray-300 rounded-md px-3 py-2">
 <option value="SHIRTS">Camisas</option>
 <option value="PANTS">Pantalones</option>
 <option value="DRESSES">Vestidos</option>
 <option value="JACKETS">Chaquetas</option>
 <option value="FOOTWEAR">Calzado</option>
 <option value="ACCESSORIES">Accesorios</option>
 </select>
 </div>

 <div>
 <label className="block text-sm font-medium mb-1">Temporada</label>
 <select {...methods.register('season')} className="w-full text-sm border-gray-300 rounded-md px-3 py-2">
 <option value="SPRING_SUMMER">Primavera / Verano</option>
 <option value="AUTUMN_WINTER">Otoño / Invierno</option>
 <option value="BACK_TO_SCHOOL">Back to School</option>
 <option value="SPECIAL_PROMO">Promoción Especial</option>
 </select>
 </div>

 <div>
 <label className="block text-sm font-medium mb-1">Proveedor</label>
 <select {...methods.register('providerId')} className="w-full text-sm border-gray-300 rounded-md px-3 py-2">
 <option value="">Seleccione proveedor...</option>
 {providers.map(p => (
 <option key={p.id} value={p.id}>{p.name}</option>
 ))}
 </select>
 {methods.formState.errors.providerId && <p className="text-red-500 text-xs mt-1">{methods.formState.errors.providerId.message}</p>}
 </div>
 </div>
 </div>
 </div>
 </form>
 </FormProvider>
 </div>
 );
}
