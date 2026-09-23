import React, { useState, useRef } from 'react';
import { useFormContext } from 'react-hook-form';
import type { ProductFormValues } from '../esquemas/product.schema';
import { Upload, X, Box as BoxIcon, Image as ImageIcon } from 'lucide-react';
import { catalogService } from '../servicios/catalog.service';

const MAX_3D_SIZE = 25 * 1024 * 1024; // 25MB

export function Asset3DUploader() {
 const { register, watch, setValue, formState: { errors } } = useFormContext<ProductFormValues>();
 const [isUploading3D, setIsUploading3D] = useState(false);
 const [uploadProgress, setUploadProgress] = useState(0);
 const [error3D, setError3D] = useState<string | null>(null);

 const images = watch('images') || [];
 const asset3D = watch('asset3D');
 
 const scaleFactor = watch('asset3D.scaleFactor') ?? 1.0;

 const fileInputRef2D = useRef<HTMLInputElement>(null);
 const fileInputRef3D = useRef<HTMLInputElement>(null);

 const handle2DUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
 const files = e.target.files;
 if (!files || files.length === 0) return;

 try {
 // Mock upload for images
 const file = files[0];
 const result = await catalogService.uploadAsset(file);
 setValue('images', [...images, result.url], { shouldValidate: true });
 } catch (err) {
 console.error('Failed to upload image', err);
 }
 };

 const handle3DUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
 const files = e.target.files;
 if (!files || files.length === 0) return;

 const file = files[0];
 setError3D(null);

 if (!file.name.toLowerCase().endsWith('.glb') && !file.name.toLowerCase().endsWith('.gltf')) {
 setError3D('Solo se permiten archivos .glb o .gltf');
 return;
 }

 if (file.size > MAX_3D_SIZE) {
 setError3D('El archivo supera el límite de 25 MB');
 return;
 }

 setIsUploading3D(true);
 setUploadProgress(10); // Mock progress

 try {
 // Mock upload progress
 const progressInterval = setInterval(() => {
 setUploadProgress(prev => {
 if (prev >= 90) {
 clearInterval(progressInterval);
 return 90;
 }
 return prev + 10;
 });
 }, 200);

 const result = await catalogService.uploadAsset(file);
 clearInterval(progressInterval);
 setUploadProgress(100);

 setValue('asset3D', {
 modelUrl: result.url,
 fileSizeBytes: result.fileSizeBytes,
 scaleFactor: 1.0,
 }, { shouldValidate: true });

 } catch (err) {
 setError3D('Error al subir el modelo 3D');
 } finally {
 setTimeout(() => {
 setIsUploading3D(false);
 setUploadProgress(0);
 }, 500);
 }
 };

 const removeImage = (index: number) => {
 const newImages = [...images];
 newImages.splice(index, 1);
 setValue('images', newImages, { shouldValidate: true });
 };

 const remove3DModel = () => {
 setValue('asset3D', undefined, { shouldValidate: true });
 };

 return (
 <div className="space-y-8">
 {/* 2D Images Section */}
 <div className="bg-white p-4 rounded-md shadow-sm border border-gray-200 ">
 <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
 <ImageIcon className="w-5 h-5" /> Galería 2D
 </h3>
 
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
 {images.map((url, i) => (
 <div key={i} className="relative group aspect-square rounded-md overflow-hidden bg-gray-100 border">
 <img src={url} alt={`Imagen ${i + 1}`} className="w-full h-full object-cover" />
 <button
 type="button"
 onClick={() => removeImage(i)}
 className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
 >
 <X className="w-4 h-4" />
 </button>
 </div>
 ))}
 
 <button
 type="button"
 onClick={() => fileInputRef2D.current?.click()}
 className="aspect-square rounded-md border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-500 hover:text-blue-500 hover:border-blue-500 transition-colors"
 >
 <Upload className="w-6 h-6 mb-2" />
 <span className="text-sm font-medium">Añadir Imagen</span>
 </button>
 </div>
 <input 
 type="file" 
 ref={fileInputRef2D} 
 className="hidden" 
 accept="image/*" 
 onChange={handle2DUpload} 
 />
 {errors.images && <p className="text-sm text-red-500">{errors.images.message}</p>}
 </div>

 {/* 3D Asset Section */}
 <div className="bg-white p-4 rounded-md shadow-sm border border-gray-200 ">
 <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
 <BoxIcon className="w-5 h-5" /> Modelo 3D (Vestidor Virtual AR)
 </h3>
 
 {!asset3D ? (
 <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-md bg-gray-50 ">
 <BoxIcon className="w-12 h-12 text-gray-400 mb-4" />
 <p className="text-sm text-gray-600 mb-2">Arrastra tu archivo .glb o .gltf aquí o</p>
 <button
 type="button"
 onClick={() => fileInputRef3D.current?.click()}
 className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50 "
 disabled={isUploading3D}
 >
 Seleccionar Archivo
 </button>
 <p className="text-xs text-gray-500 mt-4">Máx: 25 MB</p>
 
 {isUploading3D && (
 <div className="w-full max-w-xs mt-4">
 <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
 <div className="h-full bg-blue-600 transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
 </div>
 <p className="text-xs text-center mt-1 text-gray-500">Subiendo... {uploadProgress}%</p>
 </div>
 )}
 
 {error3D && <p className="text-sm text-red-500 mt-2">{error3D}</p>}
 </div>
 ) : (
 <div className="border border-gray-200 rounded-md p-4">
 <div className="flex items-center justify-between mb-4 pb-4 border-b ">
 <div className="flex items-center gap-3">
 <div className="p-2 bg-blue-100 text-blue-600 rounded-md">
 <BoxIcon className="w-6 h-6" />
 </div>
 <div>
 <p className="text-sm font-medium">Modelo 3D Cargado</p>
 <p className="text-xs text-gray-500">{(asset3D.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB</p>
 </div>
 </div>
 <button
 type="button"
 onClick={remove3DModel}
 className="text-red-500 hover:text-red-700 text-sm font-medium flex items-center gap-1"
 >
 <X className="w-4 h-4" /> Eliminar
 </button>
 </div>
 
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Calibración (Scale Factor): {scaleFactor.toFixed(2)}
 </label>
 <div className="flex items-center gap-4">
 <input
 type="range"
 min="0.1"
 max="5.0"
 step="0.1"
 {...register('asset3D.scaleFactor', { valueAsNumber: true })}
 className="flex-1"
 />
 <input
 type="number"
 min="0.1"
 max="5.0"
 step="0.1"
 {...register('asset3D.scaleFactor', { valueAsNumber: true })}
 className="w-20 text-sm border-gray-300 rounded-md px-2 py-1"
 />
 </div>
 <p className="text-xs text-gray-500 mt-2">Ajusta el tamaño relativo de la prenda para el vestidor de realidad aumentada.</p>
 {errors.asset3D?.scaleFactor && <p className="text-sm text-red-500 mt-1">{errors.asset3D.scaleFactor.message}</p>}
 </div>
 </div>
 )}
 
 <input 
 type="file" 
 ref={fileInputRef3D} 
 className="hidden" 
 accept=".glb,.gltf" 
 onChange={handle3DUpload} 
 />
 {errors.asset3D?.modelUrl && <p className="text-sm text-red-500 mt-2">{errors.asset3D.modelUrl.message}</p>}
 </div>
 </div>
 );
}
