import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  StyleSheet,
  Dimensions,
  StatusBar,
  Animated,
  Easing,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { WebView } from 'react-native-webview';
import {
  ArrowLeft,
  Camera,
  RotateCw,
  Plus,
  Minus,
  ChevronUp,
  ChevronDown,
  SwitchCamera,
  ShoppingBag,
  CalendarClock,
  Layers,
  Sparkles,
  ScanFace,
  Eye,
  EyeOff,
  Compass,
  CheckCircle2,
  AlertCircle,
  Scan,
  RefreshCw,
} from 'lucide-react-native';
import { useFittingBagStore } from '@modulos/reservas/almacen/fittingBag.store';
import { useCartStore } from '@modulos/carrito/almacen/cart.store';
import { MOCK_PRODUCTS } from '@modulos/catalogo/datos/mockProducts';
import { GARMENT_AR_TEXTURES } from '@modulos/catalogo/datos/garmentAssets';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@app/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'VirtualTryOn'>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// PRENDAS SELECCIONADAS EXCLUSIVAMENTE PARA PRUEBA AR (Poleras y Shorts)
const AR_ELIGIBLE_PRODUCTS = MOCK_PRODUCTS.filter(p => p.hasArTryOn === true);

export const VirtualTryOnScreen: React.FC<Props> = ({ navigation, route }) => {
  const initialProductId = route.params?.productId;
  const defaultProduct =
    AR_ELIGIBLE_PRODUCTS.find(p => p.id === initialProductId) ||
    MOCK_PRODUCTS.find(p => p.id === initialProductId) ||
    AR_ELIGIBLE_PRODUCTS[0];

  const [permission, requestPermission] = useCameraPermissions();
  const webViewRef = useRef<WebView>(null);

  // Prenda seleccionada
  const [selectedProductId, setSelectedProductId] = useState<string>(defaultProduct.id);
  const product =
    AR_ELIGIBLE_PRODUCTS.find(p => p.id === selectedProductId) ||
    MOCK_PRODUCTS.find(p => p.id === selectedProductId) ||
    defaultProduct;

  const [selectedSize, setSelectedSize] = useState<string>('M');
  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    product.variants[0]?.id || ''
  );

  // Configuración de cámara
  const [facing, setFacing] = useState<'front' | 'back'>('front');
  const [cameraActive, setCameraActive] = useState<boolean>(true);
  const [showLandmarks, setShowLandmarks] = useState<boolean>(true);
  const [useNativeCameraFallback, setUseNativeCameraFallback] = useState<boolean>(false);

  // Estados de Detección Corporal IA Real (Google MediaPipe Pose 33 Puntos + Tier-2 Óptico)
  const [trackingState, setTrackingState] = useState<'SCANNING' | 'LOCKED' | 'NOT_FOUND'>('SCANNING');
  const [activeAiModel, setActiveAiModel] = useState<'MEDIAPIPE' | 'OPTICAL'>('MEDIAPIPE');
  const [scanStatusText, setScanStatusText] = useState<string>('Iniciando IA MediaPipe Pose...');
  const [detectedConfidence, setDetectedConfidence] = useState<number>(0);

  const laserAnim = useRef(new Animated.Value(0)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;
  const statusPulseAnim = useRef(new Animated.Value(1)).current;

  // Calibración y Ajuste Fino
  const [scale, setScale] = useState<number>(1.0);
  const [verticalOffset, setVerticalOffset] = useState<number>(0);
  const [rotationAngle, setRotationAngle] = useState<number>(0);

  // Stores
  const { addItem: addToFittingBag } = useFittingBagStore();
  const { addItem: addToCart } = useCartStore();

  const activeVariant =
    product.variants.find(v => v.id === selectedVariantId) ||
    product.variants.find(v => v.sizeName === selectedSize) ||
    product.variants[0];

  const isShortsItem = product.arGarmentType === 'SHORTS' || product.targetRegion === 'WAIST';

  // Solicitar permiso de cámara automáticamente al entrar
  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission?.granted]);

  // Animación continua del láser durante escaneo
  useEffect(() => {
    if (trackingState === 'SCANNING') {
      laserAnim.setValue(0);
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(laserAnim, {
            toValue: 1,
            duration: 850,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(laserAnim, {
            toValue: 0,
            duration: 850,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [trackingState]);

  // Animación de pulso para estado NO DETECTADO
  useEffect(() => {
    if (trackingState === 'NOT_FOUND') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(statusPulseAnim, {
            toValue: 1.08,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(statusPulseAnim, {
            toValue: 1.0,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      statusPulseAnim.setValue(1);
    }
  }, [trackingState]);

  // Iniciar / reiniciar análisis al cambiar de prenda
  useEffect(() => {
    retryBodyScan();
  }, [selectedProductId]);

  // Sincronizar parámetros con el motor AR
  useEffect(() => {
    sendGarmentConfigToAr();
  }, [selectedProductId, selectedSize, selectedVariantId, scale, verticalOffset, rotationAngle, showLandmarks]);

  const sendGarmentConfigToAr = useCallback(() => {
    if (!webViewRef.current) return;
    const config = {
      productId: product.id,
      garmentType: isShortsItem ? 'SHORTS' : 'SHIRT',
      colorHex: activeVariant.colorHex || '#FFFFFF',
      size: selectedSize,
      scaleMultiplier: scale,
      offsetY: verticalOffset,
      rotationAngleDeg: rotationAngle,
      showLandmarks: showLandmarks,
    };
    const jsCode = `if (window.setGarmentConfig) { window.setGarmentConfig(${JSON.stringify(config)}); } true;`;
    webViewRef.current.injectJavaScript(jsCode);
  }, [product.id, isShortsItem, activeVariant.colorHex, selectedSize, scale, verticalOffset, rotationAngle, showLandmarks]);

  // Función explícita de Recarga / Reintento de Análisis Biométrico
  const retryBodyScan = () => {
    setTrackingState('SCANNING');
    setScanStatusText(
      isShortsItem
        ? 'Buscando cintura y caderas en la cámara...'
        : 'Buscando torso y hombros en la cámara...'
    );
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript('if (window.retryAnalysis) { window.retryAnalysis(); } true;');
    }
  };

  // Manejo de mensajes entrantes desde el motor de Visión en el WebView
  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'CAMERA_READY') {
        setUseNativeCameraFallback(false);
        setTrackingState('SCANNING');
        setScanStatusText(
          isShortsItem
            ? 'Cámara activa • Encuadra tu cintura...'
            : 'Cámara activa • Encuadra tu torso...'
        );
      } else if (data.type === 'DETECTION_STATUS') {
        setTrackingState(data.state);
        setScanStatusText(data.message || '');
        if (data.aiModel) {
          setActiveAiModel(data.aiModel);
        }
        if (data.confidence !== undefined) {
          setDetectedConfidence(data.confidence);
        }
      } else if (data.type === 'CAMERA_ERROR') {
        console.warn('WebView camera not available, falling back to native CameraView:', data.error);
        setScanStatusText(data.error || 'Cámara no disponible');
        setUseNativeCameraFallback(true);
      }
    } catch (e) {
      // Ignorar mensajes no formateados en JSON
    }
  };

  // Alternar cámara frontal / trasera
  const toggleFacing = () => {
    const nextFacing = facing === 'front' ? 'back' : 'front';
    setFacing(nextFacing);
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(
        `if (window.switchCameraFacing) { window.switchCameraFacing('${nextFacing}'); } true;`
      );
    }
    retryBodyScan();
  };

  // Calibración rápida de rotación
  const handleSetQuickAngle = (degrees: number) => {
    setRotationAngle(degrees);
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(
        `if (window.setRotationAngle) { window.setRotationAngle(${degrees}); } true;`
      );
    }
  };

  // Auto-calce y reinicio
  const handleAutoFit = () => {
    setScale(1.0);
    setVerticalOffset(0);
    handleSetQuickAngle(0);
    retryBodyScan();
  };

  // Guardar en el probador físico
  const handleReservePhysical = () => {
    const res = addToFittingBag({
      id: `fit-${Date.now()}`,
      productId: product.id,
      productName: product.name,
      variantId: activeVariant.id,
      sku: activeVariant.sku,
      sizeName: selectedSize,
      colorName: activeVariant.colorName,
      colorHex: activeVariant.colorHex,
      price: activeVariant.price,
      imageUrl: product.images[0],
    });

    if (!res.success) {
      Alert.alert('Límite de Probador', res.message);
    } else {
      Alert.alert(
        '¡Prenda Apartada con Éxito!',
        `La prenda ${product.name} (Talla ${selectedSize}, ${activeVariant.colorName}) fue guardada en tu probador físico.`,
        [
          { text: 'Seguir en AR', style: 'cancel' },
          { text: 'Ir a mi Probador', onPress: () => navigation.navigate('FittingBag') },
        ]
      );
    }
  };

  // Añadir al carrito
  const handleAddToCart = () => {
    addToCart({
      productId: product.id,
      variantId: activeVariant.id,
      name: product.name,
      sizeName: selectedSize,
      colorName: activeVariant.colorName,
      colorHex: activeVariant.colorHex,
      price: activeVariant.price,
      quantity: 1,
      imageUrl: product.images[0],
    });

    Alert.alert('¡Añadido a la Bolsa!', `${product.name} agregado para compra.`);
  };

  // Capturar foto AR con flash visual
  const handleCapturePhoto = () => {
    Animated.sequence([
      Animated.timing(flashAnim, {
        toValue: 1,
        duration: 90,
        useNativeDriver: true,
      }),
      Animated.timing(flashAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();

    Alert.alert(
      '¡Look AR Capturado!',
      `Has probado: ${product.name} (Talla ${selectedSize}, ${activeVariant.colorName}). Calce anatómico fijado.`,
      [
        { text: 'Seguir Probando', style: 'cancel' },
        { text: 'Apartar en Probador', onPress: handleReservePhysical },
      ]
    );
  };

  // Código HTML5 / WebRTC y Motor de Visión & Tracking en Tiempo Real con Google MediaPipe Pose (33 Pts)
  const arFittingHtmlSource = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>AR Body Tracking Real-Time Try-On MediaPipe Pose</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%;
      height: 100%;
      background: transparent !important;
      overflow: hidden;
      touch-action: none;
      -webkit-user-select: none;
      user-select: none;
    }
    #camera-video {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      transform: scaleX(-1);
      z-index: 1;
      background: transparent !important;
    }
    #ar-canvas {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 2;
      pointer-events: none;
      background: transparent !important;
    }
    #cv-canvas {
      display: none;
    }
  </style>
</head>
<body>
  <video id="camera-video" playsinline webkit-playsinline autoplay muted></video>
  <canvas id="ar-canvas"></canvas>
  <canvas id="cv-canvas" width="160" height="120"></canvas>

  <script>
    (function() {
      // Captura de errores globales para depuración inmediata
      window.onerror = function(message, source, lineno, colno, error) {
        postToNative({
          type: 'CAMERA_ERROR',
          error: 'Error JS Web: ' + message + ' (' + lineno + ':' + colno + ')'
        });
        return false;
      };

      const GARMENT_TEXTURES = ${JSON.stringify(GARMENT_AR_TEXTURES)};
      const video = document.getElementById('camera-video');
      const canvas = document.getElementById('ar-canvas');
      const ctx = canvas.getContext('2d');
      const cvCanvas = document.getElementById('cv-canvas');
      const cvCtx = cvCanvas.getContext('2d', { willReadFrequently: true });

      let currentStream = null;
      let facingMode = 'user'; // 'user' (frontal) o 'environment' (trasera)

      let currentConfig = {
        productId: '${product.id}',
        garmentType: '${isShortsItem ? 'SHORTS' : 'SHIRT'}',
        colorHex: '${activeVariant.colorHex || '#FFFFFF'}',
        size: '${selectedSize}',
        scaleMultiplier: ${scale},
        offsetY: ${verticalOffset},
        rotationAngleDeg: 0,
        showLandmarks: true
      };

      // Estados de Detección: 'SCANNING' | 'LOCKED' | 'NOT_FOUND'
      let trackingState = 'SCANNING';
      let scanTimerStart = Date.now();
      let consecutiveHits = 0;
      let consecutiveLosses = 0;
      let lastAnalysisTime = 0;

      // MediaPipe Pose Engine
      let poseInstance = null;
      let isMediaPipeReady = false;
      let isPoseProcessing = false;
      let lastPoseSent = 0;
      let isMediaPipeLoading = false;

      // Coordenadas detectadas y suavizadas (LERP a 60 FPS)
      let targetBody = {
        x: 0.5,
        y: 0.40,
        width: 0.45,
        height: 0.45,
        angle: 0,
        confidence: 0,
        detected: false,
        source: 'NONE',
        landmarks: null
      };

      let smoothBody = {
        x: 0.5,
        y: 0.40,
        width: 0.45,
        height: 0.45,
        angle: 0,
        opacity: 0,
        landmarks: null
      };

      // Imagen de la prenda cargada
      let garmentImage = new Image();
      let garmentLoaded = false;

      function postToNative(data) {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify(data));
        }
      }

      // 1. INICIALIZACIÓN DE CÁMARA WEBRTC (MULTI-COMPATIBLE)
      async function getMediaStream(constraints) {
        if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
          return await navigator.mediaDevices.getUserMedia(constraints);
        }
        const legacyGet = navigator.getUserMedia ||
                          navigator.webkitGetUserMedia ||
                          navigator.mozGetUserMedia ||
                          navigator.msGetUserMedia;
        if (legacyGet) {
          return new Promise(function(resolve, reject) {
            legacyGet.call(navigator, constraints, resolve, reject);
          });
        }
        throw new Error('WebRTC no soportado en este WebView');
      }

      async function initCamera() {
        if (currentStream) {
          try {
            currentStream.getTracks().forEach(function(track) { track.stop(); });
          } catch(e) {}
          currentStream = null;
        }

        const constraintList = [
          { video: { facingMode: facingMode, width: { ideal: 640 }, height: { ideal: 480 } }, audio: false },
          { video: { facingMode: facingMode }, audio: false },
          { video: true, audio: false }
        ];

        let stream = null;
        let lastError = null;
        for (let i = 0; i < constraintList.length; i++) {
          try {
            stream = await getMediaStream(constraintList[i]);
            if (stream) break;
          } catch(err) {
            lastError = err;
          }
        }

        if (!stream) {
          console.warn('WebRTC stream no obtenido:', lastError);
          // Ocultar elemento de video en WebView para dejar ver la cámara nativa de fondo sin pantalla negra
          video.style.display = 'none';
          postToNative({
            type: 'CAMERA_ERROR',
            error: (lastError ? (lastError.name || lastError.message) : 'Cámara WebRTC no disponible')
          });
          return;
        }

        currentStream = stream;
        video.srcObject = stream;
        video.style.transform = (facingMode === 'user') ? 'scaleX(-1)' : 'scaleX(1)';
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        video.setAttribute('autoplay', 'true');
        video.setAttribute('muted', 'true');
        video.muted = true;
        video.style.display = 'block';

        video.onloadedmetadata = function() {
          video.play().then(function() {
            postToNative({ type: 'CAMERA_READY' });
          }).catch(function(e) {
            console.warn('video play warning:', e);
            postToNative({ type: 'CAMERA_READY' });
          });
        };

        setTimeout(function() {
          if (video.paused && currentStream) {
            video.play().catch(function() {});
          }
        }, 400);

        postToNative({ type: 'CAMERA_READY' });

        // Cargar MediaPipe Pose de manera asíncrona en segundo plano sin bloquear la cámara
        loadMediaPipePoseAsync();
      }

      window.retryCamera = initCamera;

      // 2. CARGA ASÍNCRONA DE GOOGLE MEDIAPIPE POSE
      function loadMediaPipePoseAsync() {
        if (typeof window.Pose !== 'undefined') {
          initMediaPipePose();
          return;
        }

        if (isMediaPipeLoading) return;
        isMediaPipeLoading = true;

        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/pose.js';
        script.crossOrigin = 'anonymous';
        script.async = true;
        script.onload = function() {
          isMediaPipeLoading = false;
          initMediaPipePose();
        };
        script.onerror = function(err) {
          isMediaPipeLoading = false;
          console.warn('MediaPipe Pose CDN no disponible, ejecutando en modo óptico calibrado.');
          postToNative({
            type: 'DETECTION_STATUS',
            state: 'SCANNING',
            aiModel: 'OPTICAL',
            message: currentConfig.garmentType === 'SHORTS'
              ? 'Buscando cintura y caderas en la cámara...'
              : 'Buscando torso y hombros en la cámara...'
          });
        };
        document.head.appendChild(script);
      }

      function initMediaPipePose() {
        if (typeof window.Pose === 'undefined' || poseInstance) return;

        try {
          poseInstance = new window.Pose({
            locateFile: function(file) {
              return 'https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/' + file;
            }
          });

          poseInstance.setOptions({
            modelComplexity: 0, // Lite: ultra-rápido en smartphones
            smoothLandmarks: true,
            enableSegmentation: false,
            smoothSegmentation: false,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
          });

          poseInstance.onResults(handleMediaPipeResults);
          isMediaPipeReady = true;
          console.log('✓ MediaPipe Pose Lite activo');
          postToNative({
            type: 'DETECTION_STATUS',
            state: 'SCANNING',
            aiModel: 'MEDIAPIPE',
            message: 'IA MediaPipe Pose activa • Escaneando silueta 33 Pts...'
          });
        } catch (err) {
          console.warn('Error inicializando MediaPipe Pose:', err);
        }
      }

      // 3. PROYECCIÓN DE COORDENADAS MATRICIALES (COMPENSANDO OBJECT-FIT: COVER Y EFECTO ESPEJO)
      function projectLandmark(lm, screenW, screenH, videoW, videoH, isUserFacing) {
        const scale = Math.max(screenW / videoW, screenH / videoH);
        const renderW = videoW * scale;
        const renderH = videoH * scale;
        const offX = (screenW - renderW) / 2;
        const offY = (screenH - renderH) / 2;

        let sx;
        if (isUserFacing) {
          sx = ((1.0 - lm.x) * renderW) + offX;
        } else {
          sx = (lm.x * renderW) + offX;
        }
        const sy = (lm.y * renderH) + offY;

        return {
          x: sx,
          y: sy,
          z: lm.z,
          visibility: lm.visibility !== undefined ? lm.visibility : 1.0
        };
      }

      // 4. PROCESAMIENTO DE SALIDA MEDIAPIPE POSE (33 PUNTOS)
      function handleMediaPipeResults(results) {
        if (!results || !results.poseLandmarks || results.poseLandmarks.length < 33) {
          consecutiveLosses++;
          if (consecutiveLosses > 25) {
            targetBody.detected = false;
          }
          return;
        }

        const screenW = canvas.width;
        const screenH = canvas.height;
        const videoW = video.videoWidth || screenW;
        const videoH = video.videoHeight || screenH;
        const isUserFacing = (facingMode === 'user');
        const isShorts = (currentConfig.garmentType === 'SHORTS');
        const isCrop = (currentConfig.productId === 'prod-7');
        const sizeFactor = getSizeMultiplier(currentConfig.size);
        const scaleMult = (currentConfig.scaleMultiplier || 1.0);

        const lms = results.poseLandmarks;
        const p11 = projectLandmark(lms[11], screenW, screenH, videoW, videoH, isUserFacing); // Hombro Izq
        const p12 = projectLandmark(lms[12], screenW, screenH, videoW, videoH, isUserFacing); // Hombro Der
        const p23 = projectLandmark(lms[23], screenW, screenH, videoW, videoH, isUserFacing); // Cadera Izq
        const p24 = projectLandmark(lms[24], screenW, screenH, videoW, videoH, isUserFacing); // Cadera Der

        const shouldersVis = (lms[11].visibility > 0.35 && lms[12].visibility > 0.35);
        const hipsVis = (lms[23].visibility > 0.30 && lms[24].visibility > 0.30);

        if (!isShorts) {
          // ================= POLERAS / TORSO / TOPS =================
          if (shouldersVis) {
            const pL = p11.x < p12.x ? p11 : p12;
            const pR = p11.x < p12.x ? p12 : p11;

            const csX = (pL.x + pR.x) / 2;
            const csY = (pL.y + pR.y) / 2;
            const dx = pR.x - pL.x;
            const dy = pR.y - pL.y;
            const ws = Math.sqrt(dx * dx + dy * dy);
            const theta = Math.atan2(dy, dx);

            const widthMult = isCrop ? 1.65 : 1.74;
            const heightMult = isCrop ? 0.85 : 1.08;
            const screenWg = ws * widthMult * sizeFactor * scaleMult;
            const screenHg = screenWg * heightMult;

            // ANCLAJE ANATÓMICO: El escote de la polera se apoya exactamente en la clavícula (csY)
            const centerY = csY + (screenHg * 0.36) + currentConfig.offsetY;
            const centerX = csX;

            targetBody.x = centerX / screenW;
            targetBody.y = centerY / screenH;
            targetBody.width = screenWg / screenW;
            targetBody.height = screenHg / screenH;
            targetBody.angle = theta;
            targetBody.confidence = Math.min(0.99, (lms[11].visibility + lms[12].visibility) / 2);
            targetBody.detected = true;
            targetBody.source = 'MEDIAPIPE';

            targetBody.landmarks = {
              shoulderLeft: pL,
              shoulderRight: pR,
              clavicle: { x: csX, y: csY },
              hipLeft: p23,
              hipRight: p24
            };

            consecutiveHits++;
            consecutiveLosses = 0;
          } else {
            consecutiveLosses++;
            if (consecutiveLosses > 20) {
              targetBody.detected = false;
            }
          }
        } else {
          // ================= SHORTS / CADERA / CINTURA =================
          if (hipsVis) {
            const phL = p23.x < p24.x ? p23 : p24;
            const phR = p23.x < p24.x ? p24 : p23;

            const chX = (phL.x + phR.x) / 2;
            const chY = (phL.y + phR.y) / 2;
            const dx = phR.x - phL.x;
            const dy = phR.y - phL.y;
            const wh = Math.sqrt(dx * dx + dy * dy);
            const theta = Math.atan2(dy, dx);

            const screenWg = wh * 1.48 * sizeFactor * scaleMult;
            const screenHg = screenWg * 0.88;

            // Línea natural de cintura (ligeramente sobre las crestas ilíacas)
            const waistY = chY - (wh * 0.20);
            const centerY = waistY + (screenHg * 0.42) + currentConfig.offsetY;
            const centerX = chX;

            targetBody.x = centerX / screenW;
            targetBody.y = centerY / screenH;
            targetBody.width = screenWg / screenW;
            targetBody.height = screenHg / screenH;
            targetBody.angle = theta;
            targetBody.confidence = Math.min(0.99, (lms[23].visibility + lms[24].visibility) / 2);
            targetBody.detected = true;
            targetBody.source = 'MEDIAPIPE';

            targetBody.landmarks = {
              hipLeft: phL,
              hipRight: phR,
              waist: { x: chX, y: waistY }
            };

            consecutiveHits++;
            consecutiveLosses = 0;
          } else if (shouldersVis) {
            // Encuadre de torso superior: estimación anatómica de cadera a partir de hombros
            const pL = p11.x < p12.x ? p11 : p12;
            const pR = p11.x < p12.x ? p12 : p11;
            const csX = (pL.x + pR.x) / 2;
            const csY = (pL.y + pR.y) / 2;
            const ws = Math.sqrt((pR.x - pL.x)*(pR.x - pL.x) + (pR.y - pL.y)*(pR.y - pL.y));
            const theta = Math.atan2(pR.y - pL.y, pR.x - pL.x);

            const estimatedChX = csX;
            const estimatedChY = csY + (ws * 1.38);
            const estimatedWh = ws * 0.86;

            const screenWg = estimatedWh * 1.48 * sizeFactor * scaleMult;
            const screenHg = screenWg * 0.88;
            const waistY = estimatedChY - (estimatedWh * 0.20);
            const centerY = waistY + (screenHg * 0.42) + currentConfig.offsetY;

            targetBody.x = estimatedChX / screenW;
            targetBody.y = centerY / screenH;
            targetBody.width = screenWg / screenW;
            targetBody.height = screenHg / screenH;
            targetBody.angle = theta;
            targetBody.confidence = 0.75;
            targetBody.detected = true;
            targetBody.source = 'MEDIAPIPE_ESTIMATED';

            targetBody.landmarks = {
              hipLeft: { x: estimatedChX - (estimatedWh * 0.5), y: estimatedChY },
              hipRight: { x: estimatedChX + (estimatedWh * 0.5), y: estimatedChY },
              waist: { x: estimatedChX, y: waistY }
            };

            consecutiveHits++;
            consecutiveLosses = 0;
          } else {
            consecutiveLosses++;
            if (consecutiveLosses > 20) {
              targetBody.detected = false;
            }
          }
        }

        updateTrackingStateMachine(isShorts);
      }

      function updateTrackingStateMachine(isShorts) {
        if (trackingState === 'SCANNING') {
          if (consecutiveHits >= 2) {
            trackingState = 'LOCKED';
            const isMediaPipe = targetBody.source.indexOf('MEDIAPIPE') === 0;
            postToNative({
              type: 'DETECTION_STATUS',
              state: 'LOCKED',
              aiModel: isMediaPipe ? 'MEDIAPIPE' : 'OPTICAL',
              message: isShorts
                ? (isMediaPipe ? '✓ IA MediaPipe: Cadera calzada (33 Pts)' : '✓ Cadera reconocida • Calce fijado')
                : (isMediaPipe ? '✓ IA MediaPipe: Torso calzado (33 Pts)' : '✓ Torso reconocido • Calce fijado'),
              confidence: targetBody.confidence
            });
          } else if (Date.now() - scanTimerStart > 8000 && consecutiveLosses > 30) {
            trackingState = 'NOT_FOUND';
            postToNative({
              type: 'DETECTION_STATUS',
              state: 'NOT_FOUND',
              message: isShorts
                ? '⚠ Ubica tu cintura en el marco de la cámara'
                : '⚠ Coloca tu torso frente a la cámara',
              confidence: 0.1
            });
          }
        } else if (trackingState === 'LOCKED') {
          if (consecutiveLosses >= 25) {
            trackingState = 'SCANNING';
            postToNative({
              type: 'DETECTION_STATUS',
              state: 'SCANNING',
              message: isShorts
                ? 'Reajustando cintura y caderas con IA...'
                : 'Reajustando torso y hombros con IA...',
              confidence: targetBody.confidence
            });
          }
        } else if (trackingState === 'NOT_FOUND') {
          if (consecutiveHits >= 2) {
            trackingState = 'LOCKED';
            const isMediaPipe = targetBody.source.indexOf('MEDIAPIPE') === 0;
            postToNative({
              type: 'DETECTION_STATUS',
              state: 'LOCKED',
              aiModel: isMediaPipe ? 'MEDIAPIPE' : 'OPTICAL',
              message: isShorts
                ? (isMediaPipe ? '✓ IA MediaPipe: Cadera calzada (33 Pts)' : '✓ Cadera recuperada • Calce activo')
                : (isMediaPipe ? '✓ IA MediaPipe: Torso calzado (33 Pts)' : '✓ Torso recuperado • Calce activo'),
              confidence: targetBody.confidence
            });
          }
        }
      }

      // 5. CARGA Y PREPARACIÓN DE TEXTURA DE PRENDA
      function loadGarmentTexture() {
        garmentLoaded = false;
        const prodId = currentConfig.productId;
        const textureSrc = (GARMENT_TEXTURES && GARMENT_TEXTURES[prodId]) ? GARMENT_TEXTURES[prodId] : '';

        if (textureSrc) {
          garmentImage.src = textureSrc;
          garmentImage.onload = function() {
            garmentLoaded = true;
          };
          garmentImage.onerror = function() {
            generateProceduralGarment();
          };
        } else {
          generateProceduralGarment();
        }
      }

      function generateProceduralGarment() {
        const pCanvas = document.createElement('canvas');
        pCanvas.width = 512;
        pCanvas.height = 512;
        const pCtx = pCanvas.getContext('2d');
        pCtx.clearRect(0, 0, 512, 512);

        const isShorts = (currentConfig.garmentType === 'SHORTS');
        const color = currentConfig.colorHex || (isShorts ? '#3B82F6' : '#FFFFFF');

        pCtx.fillStyle = color;
        pCtx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        pCtx.lineWidth = 4;

        if (isShorts) {
          pCtx.beginPath();
          pCtx.moveTo(110, 80);
          pCtx.lineTo(402, 80);
          pCtx.lineTo(422, 380);
          pCtx.lineTo(276, 400);
          pCtx.lineTo(256, 290);
          pCtx.lineTo(236, 400);
          pCtx.lineTo(90, 380);
          pCtx.closePath();
          pCtx.fill();
          pCtx.stroke();
        } else {
          pCtx.beginPath();
          pCtx.moveTo(150, 90);
          pCtx.quadraticCurveTo(256, 135, 362, 90);
          pCtx.lineTo(470, 185);
          pCtx.lineTo(418, 245);
          pCtx.lineTo(365, 195);
          pCtx.lineTo(358, 440);
          pCtx.lineTo(154, 440);
          pCtx.lineTo(147, 195);
          pCtx.lineTo(94, 245);
          pCtx.lineTo(42, 185);
          pCtx.closePath();
          pCtx.fill();
          pCtx.stroke();
        }

        garmentImage.src = pCanvas.toDataURL();
        garmentImage.onload = function() {
          garmentLoaded = true;
        };
      }

      // 6. MOTOR DE VISIÓN ÓPTICO ANATÓMICO (TIER-2 RESPALDO INSTANTÁNEO)
      let prevFrameData = null;

      function analyzeVideoFrame() {
        if (!video.videoWidth || !video.videoHeight || video.readyState < 2) return;

        cvCtx.drawImage(video, 0, 0, 160, 120);
        const imgData = cvCtx.getImageData(0, 0, 160, 120);
        const data = imgData.data;
        const isShorts = (currentConfig.garmentType === 'SHORTS');
        const isCrop = (currentConfig.productId === 'prod-7');

        let bgR = 0, bgG = 0, bgB = 0, bgCount = 0;
        for (let y = 10; y < 110; y += 5) {
          for (let x = 0; x < 8; x += 3) {
            const idx = (y * 160 + x) * 4;
            bgR += data[idx]; bgG += data[idx+1]; bgB += data[idx+2];
            bgCount++;
          }
          for (let x = 152; x < 160; x += 3) {
            const idx = (y * 160 + x) * 4;
            bgR += data[idx]; bgG += data[idx+1]; bgB += data[idx+2];
            bgCount++;
          }
        }
        const avgBgR = bgCount > 0 ? bgR / bgCount : 128;
        const avgBgG = bgCount > 0 ? bgG / bgCount : 128;
        const avgBgB = bgCount > 0 ? bgB / bgCount : 128;
        const avgBgLum = 0.299 * avgBgR + 0.587 * avgBgG + 0.114 * avgBgB;

        const rowStart = isShorts ? 36 : 16;
        const rowEnd   = isShorts ? 110 : 90;
        const colStart = 16;
        const colEnd   = 144;

        let totalPoints = 0;
        let sumX = 0;
        let sumY = 0;
        let minX = 160;
        let maxX = 0;

        const rowWidths = new Float32Array(120);
        const rowCenters = new Float32Array(120);
        const rowPointCounts = new Int32Array(120);

        for (let y = rowStart; y < rowEnd; y += 2) {
          let rowMinX = 160;
          let rowMaxX = 0;
          let rowPoints = 0;
          let rowSumX = 0;

          for (let x = colStart; x < colEnd; x += 2) {
            const idx = (y * 160 + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;

            const dr = r - avgBgR;
            const dg = g - avgBgG;
            const db = b - avgBgB;
            const colorDist = Math.sqrt(dr*dr + dg*dg + db*db);
            const isDiffFromBg = (colorDist > 22 || Math.abs(lum - avgBgLum) > 16);

            const isSkin = (
              r > 40 && g > 25 && b > 15 &&
              r >= g && (r - b) >= 4 &&
              Math.abs(r - g) < 85
            );

            const normX = x / 160;
            const isCentralCorridor = Math.abs(normX - 0.50) < 0.38;

            if ((isDiffFromBg && isCentralCorridor) || isSkin) {
              sumX += x;
              sumY += y;
              totalPoints++;
              rowPoints++;
              rowSumX += x;
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (x < rowMinX) rowMinX = x;
              if (x > rowMaxX) rowMaxX = x;
            }
          }

          if (rowPoints >= 4) {
            rowWidths[y] = (rowMaxX - rowMinX);
            rowCenters[y] = rowSumX / rowPoints;
            rowPointCounts[y] = rowPoints;
          }
        }

        const widthPx = maxX > minX ? (maxX - minX) : 0;
        const isBodyDetected = (widthPx >= 22 && widthPx <= 138 && totalPoints >= 35);

        if (isBodyDetected) {
          if (!isShorts) {
            let maxShoulderW = 0;
            let shoulderY = 38;
            let shoulderX = sumX / totalPoints;

            for (let y = 22; y < 60; y += 2) {
              if (rowWidths[y] > maxShoulderW && rowPointCounts[y] >= 6) {
                maxShoulderW = rowWidths[y];
                shoulderY = y;
                if (rowCenters[y] > 0) shoulderX = rowCenters[y];
              }
            }

            const effectiveWidthPx = maxShoulderW > 24 ? maxShoulderW : widthPx;
            const normWidth = Math.min(0.85, Math.max(0.35, (effectiveWidthPx / 160) * 1.68));
            const normHeight = normWidth * (isCrop ? 0.85 : 1.08);

            // Anclaje de clavícula
            const clavicleNormY = (shoulderY + 6) / 120;
            const centerY = clavicleNormY + (normHeight * 0.36) + (currentConfig.offsetY / canvas.height);

            targetBody.x = shoulderX / 160;
            targetBody.y = centerY;
            targetBody.width = normWidth;
            targetBody.height = normHeight;
            targetBody.angle = 0;
            targetBody.confidence = Math.min(0.95, 0.50 + (totalPoints / 300));
            targetBody.detected = true;
            targetBody.source = 'OPTICAL';
          } else {
            let maxPelvisW = 0;
            let hipY = 66;
            let hipX = sumX / totalPoints;

            for (let y = 46; y < 94; y += 2) {
              if (rowWidths[y] > maxPelvisW && rowPointCounts[y] >= 6) {
                maxPelvisW = rowWidths[y];
                hipY = y;
                if (rowCenters[y] > 0) hipX = rowCenters[y];
              }
            }

            const effectiveHipPx = maxPelvisW > 22 ? maxPelvisW : widthPx;
            const normWidth = Math.min(0.82, Math.max(0.32, (effectiveHipPx / 160) * 1.48));
            const normHeight = normWidth * 0.88;

            // Anclaje de pretina en cintura natural
            const waistNormY = ((hipY - 4) / 120);
            const centerY = waistNormY + (normHeight * 0.42) + (currentConfig.offsetY / canvas.height);

            targetBody.x = hipX / 160;
            targetBody.y = centerY;
            targetBody.width = normWidth;
            targetBody.height = normHeight;
            targetBody.angle = 0;
            targetBody.confidence = Math.min(0.95, 0.50 + (totalPoints / 300));
            targetBody.detected = true;
            targetBody.source = 'OPTICAL';
          }

          consecutiveHits++;
          consecutiveLosses = 0;
        } else {
          targetBody.detected = false;
          consecutiveLosses++;
          consecutiveHits = 0;
        }

        updateTrackingStateMachine(isShorts);
      }

      // Factor de talla retail
      function getSizeMultiplier(size) {
        switch (size) {
          case 'S':  return 0.94;
          case 'M':  return 1.00;
          case 'L':  return 1.06;
          case 'XL': return 1.14;
          default:   return 1.00;
        }
      }

      // 7. BUCLE DE RENDERIZADO Y SEGUIMIENTO EN TIEMPO REAL A 60 FPS
      function renderLoop(timestamp) {
        requestAnimationFrame(renderLoop);

        const width = window.innerWidth;
        const height = window.innerHeight;

        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
        }

        ctx.clearRect(0, 0, width, height);

        // Envío a MediaPipe Pose (hasta ~28 FPS para fluidez sin sobrecalentar GPU)
        if (isMediaPipeReady && poseInstance && !isPoseProcessing && video.videoWidth > 0 && video.readyState >= 2) {
          if (timestamp - lastPoseSent > 35) {
            isPoseProcessing = true;
            lastPoseSent = timestamp;
            poseInstance.send({ image: video })
              .catch(function(err) {})
              .finally(function() { isPoseProcessing = false; });
          }
        }

        // Si MediaPipe aún no está listo o hay pérdida continua, ejecutar motor óptico
        if (!isMediaPipeReady || consecutiveLosses > 10) {
          if (timestamp - lastAnalysisTime > 40) {
            analyzeVideoFrame();
            lastAnalysisTime = timestamp;
          }
        }

        const isShorts = (currentConfig.garmentType === 'SHORTS');
        const isCrop = (currentConfig.productId === 'prod-7');
        const sizeFactor = getSizeMultiplier(currentConfig.size);
        const scaleMult = (currentConfig.scaleMultiplier || 1.0);

        // Suavizado LERP a 60 FPS con presencia garantizada de la prenda
        if (trackingState === 'LOCKED') {
          smoothBody.opacity += (1.0 - smoothBody.opacity) * 0.22;
          smoothBody.x += (targetBody.x - smoothBody.x) * 0.28;
          smoothBody.y += (targetBody.y - smoothBody.y) * 0.28;
          smoothBody.width += (targetBody.width - smoothBody.width) * 0.24;
          smoothBody.height += (targetBody.height - smoothBody.height) * 0.24;
          smoothBody.angle += (targetBody.angle - smoothBody.angle) * 0.22;
          smoothBody.landmarks = targetBody.landmarks;
        } else if (trackingState === 'SCANNING') {
          smoothBody.opacity += (0.72 - smoothBody.opacity) * 0.16;
          const defaultX = 0.50;
          const defaultY = isShorts ? 0.62 : (isCrop ? 0.44 : 0.46);
          const defaultW = isShorts ? 0.44 : (isCrop ? 0.48 : 0.52);
          const defaultH = isShorts ? (defaultW * 0.88) : (defaultW * (isCrop ? 0.85 : 1.08));

          const tx = targetBody.detected ? targetBody.x : defaultX;
          const ty = targetBody.detected ? targetBody.y : defaultY;
          const tw = targetBody.detected ? targetBody.width : defaultW;
          const th = targetBody.detected ? targetBody.height : defaultH;
          const ta = targetBody.detected ? targetBody.angle : 0;

          smoothBody.x += (tx - smoothBody.x) * 0.18;
          smoothBody.y += (ty - smoothBody.y) * 0.18;
          smoothBody.width += (tw - smoothBody.width) * 0.16;
          smoothBody.height += (th - smoothBody.height) * 0.16;
          smoothBody.angle += (ta - smoothBody.angle) * 0.16;
          smoothBody.landmarks = targetBody.landmarks;
        } else {
          // NOT_FOUND
          smoothBody.opacity += (0.50 - smoothBody.opacity) * 0.12;
          const defaultX = 0.50;
          const defaultY = isShorts ? 0.62 : (isCrop ? 0.44 : 0.46);
          smoothBody.x += (defaultX - smoothBody.x) * 0.12;
          smoothBody.y += (defaultY - smoothBody.y) * 0.12;
          smoothBody.angle += (0 - smoothBody.angle) * 0.12;
        }

        const screenGarmentX = smoothBody.x * width;
        const screenGarmentY = (smoothBody.y * height);
        const screenGarmentW = smoothBody.width * width * sizeFactor * scaleMult;
        const screenGarmentH = smoothBody.height ? (smoothBody.height * height * sizeFactor * scaleMult) : (screenGarmentW * (isShorts ? 0.88 : (isCrop ? 0.85 : 1.08)));

        // A. DIBUJAR PRENDA FIJADA AL CUERPO ("PEGADA A LA PERSONA")
        if (smoothBody.opacity > 0.03 && garmentLoaded) {
          ctx.save();
          ctx.globalAlpha = smoothBody.opacity;
          ctx.translate(screenGarmentX, screenGarmentY);

          // Rotación afín según la inclinación del cuerpo
          const totalAngle = (smoothBody.angle || 0) + ((currentConfig.rotationAngleDeg || 0) * Math.PI / 180);
          if (totalAngle !== 0) {
            ctx.rotate(totalAngle);
          }

          // Sombra de contacto realista (Ambient Occlusion sobre la silueta)
          ctx.shadowColor = 'rgba(0, 0, 0, 0.36)';
          ctx.shadowBlur = 14;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 6;

          // Dibujar prenda centrada en la posición calculada
          ctx.drawImage(
            garmentImage,
            -screenGarmentW / 2,
            -screenGarmentH / 2,
            screenGarmentW,
            screenGarmentH
          );

          // Matiz del color de la variante
          if (currentConfig.colorHex && currentConfig.colorHex.toUpperCase() !== '#FFFFFF') {
            ctx.globalCompositeOperation = 'source-atop';
            ctx.fillStyle = currentConfig.colorHex;
            ctx.globalAlpha = smoothBody.opacity * 0.35;
            ctx.fillRect(-screenGarmentW / 2, -screenGarmentH / 2, screenGarmentW, screenGarmentH);
          }

          ctx.restore();
        }

        // B. RETÍCULAS DE ANCLAJE BIOMÉTRICO DINÁMICAS (HOMBRO, CLAVÍCULA, CADERA, CINTURA)
        if (currentConfig.showLandmarks && smoothBody.opacity > 0.1) {
          drawAnatomicalLandmarks(ctx, screenGarmentX, screenGarmentY, screenGarmentW, screenGarmentH, isShorts, smoothBody);
        }

        // C. GUÍAS VISUALES DURANTE ESCANEO
        if (trackingState === 'SCANNING') {
          drawScanningHUD(ctx, width, height, isShorts, timestamp);
        } else if (trackingState === 'NOT_FOUND') {
          drawNotFoundHUD(ctx, width, height, isShorts, timestamp);
        }
      }

      function drawAnatomicalLandmarks(c, gx, gy, gw, gh, isShorts, body) {
        c.save();
        c.globalAlpha = body.opacity * 0.95;

        const anchorColor = isShorts ? '#10B981' : '#A855F7';
        const dotColor = isShorts ? '#34D399' : '#C084FC';

        if (body.landmarks) {
          if (!isShorts && body.landmarks.shoulderLeft && body.landmarks.shoulderRight) {
            const pL = body.landmarks.shoulderLeft;
            const pR = body.landmarks.shoulderRight;
            const clavicle = body.landmarks.clavicle;

            drawAnchorPoint(c, pL.x, pL.y, anchorColor, dotColor, 'HOMBRO IZQ');
            drawAnchorPoint(c, pR.x, pR.y, anchorColor, dotColor, 'HOMBRO DER');
            if (clavicle) {
              drawAnchorPoint(c, clavicle.x, clavicle.y, '#EC4899', '#F472B6', 'ESCOTE CLAVÍCULA');
            }

            c.beginPath();
            c.setLineDash([4, 4]);
            c.strokeStyle = anchorColor;
            c.lineWidth = 1.5;
            c.moveTo(pL.x, pL.y);
            c.lineTo(pR.x, pR.y);
            c.stroke();
          } else if (isShorts && body.landmarks.hipLeft && body.landmarks.hipRight) {
            const pL = body.landmarks.hipLeft;
            const pR = body.landmarks.hipRight;
            const waist = body.landmarks.waist;

            drawAnchorPoint(c, pL.x, pL.y, anchorColor, dotColor, 'CADERA IZQ');
            drawAnchorPoint(c, pR.x, pR.y, anchorColor, dotColor, 'CADERA DER');
            if (waist) {
              drawAnchorPoint(c, waist.x, waist.y, '#3B82F6', '#60A5FA', 'CINTURA');
            }

            c.beginPath();
            c.setLineDash([4, 4]);
            c.strokeStyle = anchorColor;
            c.lineWidth = 1.5;
            c.moveTo(pL.x, pL.y);
            c.lineTo(pR.x, pR.y);
            c.stroke();
          }
        } else {
          if (isShorts) {
            const hipOffset = gw * 0.34;
            const waistY = gy - (gh * 0.40);
            drawAnchorPoint(c, gx - hipOffset, waistY, anchorColor, dotColor, 'CADERA IZQ');
            drawAnchorPoint(c, gx + hipOffset, waistY, anchorColor, dotColor, 'CADERA DER');
            drawAnchorPoint(c, gx, waistY, anchorColor, dotColor, 'CINTURA');
          } else {
            const shoulderOffset = gw * 0.36;
            const shoulderY = gy - (gh * 0.36);
            drawAnchorPoint(c, gx - shoulderOffset, shoulderY, anchorColor, dotColor, 'HOMBRO IZQ');
            drawAnchorPoint(c, gx + shoulderOffset, shoulderY, anchorColor, dotColor, 'HOMBRO DER');
            drawAnchorPoint(c, gx, shoulderY, '#EC4899', '#F472B6', 'ESCOTE CLAVÍCULA');
          }
        }

        c.restore();
      }

      function drawAnchorPoint(c, x, y, borderColor, fillColor, label) {
        c.beginPath();
        c.arc(x, y, 7, 0, Math.PI * 2);
        c.strokeStyle = borderColor;
        c.lineWidth = 2;
        c.stroke();

        c.beginPath();
        c.arc(x, y, 3, 0, Math.PI * 2);
        c.fillStyle = fillColor;
        c.fill();

        c.font = 'bold 8px monospace';
        c.fillStyle = fillColor;
        c.fillText(label, x - 18, y - 10);
      }

      function drawScanningHUD(c, w, h, isShorts, t) {
        const boxTop = isShorts ? h * 0.35 : h * 0.18;
        const boxBottom = isShorts ? h * 0.85 : h * 0.72;
        const boxLeft = w * 0.16;
        const boxRight = w * 0.84;

        c.save();
        c.strokeStyle = 'rgba(168, 85, 247, 0.45)';
        c.lineWidth = 1.5;
        c.strokeRect(boxLeft, boxTop, boxRight - boxLeft, boxBottom - boxTop);

        const laserY = boxTop + ((Math.sin(t * 0.0035) + 1) * 0.5) * (boxBottom - boxTop);
        c.beginPath();
        c.moveTo(boxLeft, laserY);
        c.lineTo(boxRight, laserY);
        c.strokeStyle = '#C084FC';
        c.lineWidth = 2.5;
        c.shadowColor = '#A855F7';
        c.shadowBlur = 8;
        c.stroke();
        c.restore();
      }

      function drawNotFoundHUD(c, w, h, isShorts, t) {
        const boxTop = isShorts ? h * 0.35 : h * 0.18;
        const boxBottom = isShorts ? h * 0.85 : h * 0.72;
        const boxLeft = w * 0.16;
        const boxRight = w * 0.84;

        const pulse = 0.5 + 0.5 * Math.sin(t * 0.006);
        c.save();
        c.strokeStyle = 'rgba(239, 68, 68, ' + (0.3 + pulse * 0.45) + ')';
        c.lineWidth = 2;
        c.strokeRect(boxLeft, boxTop, boxRight - boxLeft, boxBottom - boxTop);
        c.restore();
      }

      // API EXPUESTA PARA REACT NATIVE
      window.retryAnalysis = function() {
        trackingState = 'SCANNING';
        scanTimerStart = Date.now();
        consecutiveHits = 0;
        consecutiveLosses = 0;
        targetBody.detected = false;
        prevFrameData = null;
        postToNative({
          type: 'DETECTION_STATUS',
          state: 'SCANNING',
          aiModel: isMediaPipeReady ? 'MEDIAPIPE' : 'OPTICAL',
          message: currentConfig.garmentType === 'SHORTS'
            ? 'Buscando cintura y caderas en la cámara...'
            : 'Buscando torso y hombros en la cámara...'
        });
      };

      window.setGarmentConfig = function(config) {
        const prevProduct = currentConfig.productId;
        const prevType = currentConfig.garmentType;
        currentConfig = Object.assign({}, currentConfig, config);

        if (prevProduct !== currentConfig.productId || prevType !== currentConfig.garmentType) {
          loadGarmentTexture();
          window.retryAnalysis();
        }
      };

      window.setRotationAngle = function(deg) {
        currentConfig.rotationAngleDeg = deg;
      };

      window.switchCameraFacing = function(newFacing) {
        facingMode = newFacing === 'front' ? 'user' : 'environment';
        initCamera();
      };

      // Inicializar cámara y carga de assets
      initCamera();
      loadGarmentTexture();
      requestAnimationFrame(renderLoop);
    })();
  </script>
</body>
</html>
  `;

  // Pantalla de autorización si el usuario no ha concedido permisos de cámara aún
  if (permission && !permission.granted) {
    return (
      <SafeAreaView style={styles.rootContainer} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <View style={styles.permissionScreen}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.permissionBackButton}
            activeOpacity={0.8}
          >
            <ArrowLeft size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.permissionCard}>
            <View style={styles.permissionIconCircle}>
              <Camera size={44} color="#A855F7" />
            </View>
            <Text style={styles.permissionTitle}>Permiso de Cámara Requerido</Text>
            <Text style={styles.permissionDescription}>
              Para probarte prendas en tiempo real con IA y calibrar el calce pegado a tu cuerpo, necesitamos acceso a la cámara.
            </Text>

            <TouchableOpacity
              style={styles.permissionPrimaryButton}
              onPress={requestPermission}
              activeOpacity={0.85}
            >
              <Text style={styles.permissionPrimaryButtonText}>Activar Cámara</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.permissionSecondaryButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Text style={styles.permissionSecondaryButtonText}>Volver al Catálogo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.rootContainer} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* FLASH VISUAL AL TOMAR FOTO */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.cameraFlashOverlay,
          {
            opacity: flashAnim,
          },
        ]}
      />

      {/* ÁREA PRINCIPAL: CÁMARA CON DETECCIÓN IA Y SEGUIMIENTO */}
      <View style={styles.cameraViewport}>
        {/* Capa 1: Cámara Nativa Expo (Acceso de hardware directo sin latencia ni pantalla negra) */}
        {permission?.granted ? (
          <CameraView
            facing={facing}
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <View style={styles.fallbackBackground}>
            <View style={styles.bodySilhouetteGuide}>
              <View style={styles.silhouetteHead} />
              <View style={[styles.silhouetteTorso, isShortsItem && { height: 110 }]} />
              {isShortsItem && <View style={styles.silhouetteLegs} />}
            </View>
          </View>
        )}

        {/* Capa 2: Motor de Visión & Tracking AR WebView (Fondo transparente con prenda y retículas de IA) */}
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <WebView
            ref={webViewRef}
            key={`ar-wv-${facing}`}
            originWhitelist={['*']}
            style={styles.webViewLayer}
            containerStyle={styles.webViewLayer}
            source={{ html: arFittingHtmlSource, baseUrl: 'https://localhost' }}
            scrollEnabled={false}
            bounces={false}
            overScrollMode="never"
            javaScriptEnabled={true}
            domStorageEnabled={true}
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            mediaCapturePermissionGrantType="grant"
            onMessage={handleWebViewMessage}
            androidLayerType="hardware"
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            scalesPageToFit={false}
          />
        </View>

        {/* CABECERA FLOTANTE SUPERIOR */}
        <View style={styles.headerBar}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.headerCircleButton}
            activeOpacity={0.8}
          >
            <ArrowLeft size={18} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Insignia Dinámica de Estado de Detección IA */}
          <Animated.View
            style={[
              styles.trackingBadge,
              trackingState === 'LOCKED' && { borderColor: '#10B981', backgroundColor: 'rgba(6, 78, 59, 0.85)' },
              trackingState === 'SCANNING' && { borderColor: '#A855F7', backgroundColor: 'rgba(88, 28, 135, 0.85)' },
              trackingState === 'NOT_FOUND' && {
                borderColor: '#EF4444',
                backgroundColor: 'rgba(127, 29, 29, 0.90)',
                transform: [{ scale: statusPulseAnim }],
              },
            ]}
          >
            <View
              style={[
                styles.trackingDot,
                trackingState === 'LOCKED' && { backgroundColor: '#34D399' },
                trackingState === 'SCANNING' && { backgroundColor: '#C084FC' },
                trackingState === 'NOT_FOUND' && { backgroundColor: '#F87171' },
              ]}
            />
            <Text style={styles.trackingBadgeText}>
              {trackingState === 'LOCKED' && (
                isShortsItem
                  ? (activeAiModel === 'MEDIAPIPE' ? 'CINTURA CALZADA • IA 33 PTS' : 'CINTURA CALZADA • CALCE ACTIVO')
                  : (activeAiModel === 'MEDIAPIPE' ? 'TORSO CALZADO • IA 33 PTS' : 'TORSO CALZADO • CALCE ACTIVO')
              )}
              {trackingState === 'SCANNING' && 'ESCANEANDO POSE IA...'}
              {trackingState === 'NOT_FOUND' && 'NO RECONOCIDO • REINTENTAR'}
            </Text>
          </Animated.View>

          {/* Controles de Vista */}
          <View style={styles.headerRightActions}>
            <TouchableOpacity
              onPress={() => setShowLandmarks(prev => !prev)}
              style={[
                styles.headerCircleButton,
                showLandmarks && { backgroundColor: '#7E22CE', borderColor: '#A855F7' },
              ]}
              activeOpacity={0.8}
            >
              <Layers size={16} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={toggleFacing}
              style={styles.headerCircleButton}
              activeOpacity={0.8}
            >
              <SwitchCamera size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ESTADO INFORMATIVO FLOTANTE Y BOTÓN DE RECARGA/REINTENTO */}
        <View style={styles.rotationHintBadge}>
          {trackingState === 'SCANNING' && <Scan size={13} color="#C084FC" />}
          {trackingState === 'LOCKED' && <CheckCircle2 size={13} color="#34D399" />}
          {trackingState === 'NOT_FOUND' && <AlertCircle size={13} color="#F87171" />}

          <Text
            style={[
              styles.rotationHintText,
              trackingState === 'LOCKED' && { color: '#D1FAE5' },
              trackingState === 'NOT_FOUND' && { color: '#FECACA', fontWeight: 'bold' },
            ]}
          >
            {scanStatusText}
          </Text>

          {/* BOTÓN EXPLÍCITO RECARGAR / REINTENTAR ANÁLISIS */}
          <TouchableOpacity
            onPress={retryBodyScan}
            style={[
              styles.retryScanMiniButton,
              trackingState === 'NOT_FOUND' && { backgroundColor: '#DC2626' },
            ]}
            activeOpacity={0.8}
          >
            <RefreshCw size={11} color="#FFFFFF" />
            <Text style={styles.retryScanMiniButtonText}>Recargar</Text>
          </TouchableOpacity>
        </View>

        {/* CONTROLES FLOTANTES LATERALES (CALIBRACIÓN FINA) */}
        <View style={styles.floatingControlsPanel}>
          <Text style={styles.floatingControlsTitle}>CALCE</Text>

          {/* Subir Prenda */}
          <TouchableOpacity
            onPress={() => setVerticalOffset(prev => prev - 12)}
            style={styles.controlMiniButton}
            activeOpacity={0.8}
          >
            <ChevronUp size={15} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Bajar Prenda */}
          <TouchableOpacity
            onPress={() => setVerticalOffset(prev => prev + 12)}
            style={styles.controlMiniButton}
            activeOpacity={0.8}
          >
            <ChevronDown size={15} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.controlDivider} />

          {/* Aumentar Escala */}
          <TouchableOpacity
            onPress={() => setScale(prev => Math.min(1.4, prev + 0.05))}
            style={styles.controlMiniButton}
            activeOpacity={0.8}
          >
            <Plus size={15} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Reducir Escala */}
          <TouchableOpacity
            onPress={() => setScale(prev => Math.max(0.7, prev - 0.05))}
            style={styles.controlMiniButton}
            activeOpacity={0.8}
          >
            <Minus size={15} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.controlDivider} />

          {/* Botón Re-Escanear y Auto-Calzar */}
          <TouchableOpacity
            onPress={handleAutoFit}
            style={[styles.controlMiniButton, { backgroundColor: '#7E22CE' }]}
            activeOpacity={0.8}
          >
            <RotateCw size={13} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Giro Rápido Perfil 90° */}
          <TouchableOpacity
            onPress={() => handleSetQuickAngle(rotationAngle === 90 ? 0 : 90)}
            style={[styles.controlMiniButton, rotationAngle === 90 && { backgroundColor: '#7E22CE' }]}
            activeOpacity={0.8}
          >
            <Compass size={13} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* PANEL INFERIOR: CARRUSEL DE PRENDAS AR SELECCIONADAS Y ACCIONES */}
      <View style={styles.bottomPanelContainer}>
        {/* Fila de Título y Selector de Talla */}
        <View style={styles.productInfoRow}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.productTitleText} numberOfLines={1}>
              {product.name}
            </Text>
            <View style={styles.categoryBadgeRow}>
              <Text style={styles.productPriceText}>
                {product.categoryLabel} • Bs. {activeVariant.price.toFixed(2)}
              </Text>
              <View style={styles.arCertifiedTag}>
                <Sparkles size={8} color="#C084FC" />
                <Text style={styles.arCertifiedTagText}>
                  {isShortsItem ? 'AR CINTURA 60FPS' : 'AR TORSO 60FPS'}
                </Text>
              </View>
            </View>
          </View>

          {/* Selector de Tallas */}
          <View style={styles.sizeSelectorRow}>
            {['S', 'M', 'L', 'XL'].map(size => {
              const isSelected = selectedSize === size;
              return (
                <TouchableOpacity
                  key={size}
                  onPress={() => setSelectedSize(size)}
                  style={[
                    styles.sizeChip,
                    isSelected ? styles.sizeChipActive : styles.sizeChipInactive,
                  ]}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.sizeChipText,
                      isSelected ? styles.sizeChipTextActive : styles.sizeChipTextInactive,
                    ]}
                  >
                    {size}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Fila de Variantes de Color */}
        {product.variants.length > 1 && (
          <View style={styles.colorVariantsRow}>
            <Text style={styles.colorVariantsLabel}>Color:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {product.variants.map(variant => {
                const isVariantSelected = activeVariant.id === variant.id;
                return (
                  <TouchableOpacity
                    key={variant.id}
                    onPress={() => setSelectedVariantId(variant.id)}
                    style={[
                      styles.colorDotButton,
                      isVariantSelected && styles.colorDotButtonActive,
                    ]}
                    activeOpacity={0.8}
                  >
                    <View
                      style={[
                        styles.colorDotFill,
                        { backgroundColor: variant.colorHex },
                      ]}
                    />
                    <Text
                      style={[
                        styles.colorDotText,
                        isVariantSelected && { color: '#E9D5FF', fontWeight: 'bold' },
                      ]}
                    >
                      {variant.colorName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* CARRUSEL DE PRENDAS AR SELECCIONADAS (Solo Poleras y Shorts) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.garmentsScrollView}
          contentContainerStyle={styles.garmentsScrollContent}
        >
          {AR_ELIGIBLE_PRODUCTS.map(item => {
            const isSelected = item.id === product.id;
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => {
                  setSelectedProductId(item.id);
                  setRotationAngle(0);
                  setVerticalOffset(0);
                }}
                style={[
                  styles.garmentCard,
                  isSelected ? styles.garmentCardActive : styles.garmentCardInactive,
                ]}
                activeOpacity={0.8}
              >
                <Image
                  source={{ uri: item.images[0] }}
                  style={styles.garmentCardImage}
                  resizeMode="cover"
                />
                <View style={{ flex: 1, justifyContent: 'center' }}>
                  <Text
                    style={[
                      styles.garmentCardTitle,
                      isSelected ? styles.garmentCardTitleActive : styles.garmentCardTitleInactive,
                    ]}
                    numberOfLines={1}
                  >
                    {item.name.split(' ')[0]} {item.name.split(' ')[1] || ''}
                  </Text>
                  <Text style={styles.garmentCardPrice}>
                    Bs. {item.basePrice.toFixed(0)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* BARRA DE ACCIONES: OBTURADOR FOTO + BOTÓN PROBADOR FÍSICO + CARRITO */}
        <View style={styles.actionsBarRow}>
          {/* Botón Obturador Foto AR */}
          <TouchableOpacity
            onPress={handleCapturePhoto}
            style={styles.shutterButtonOuter}
            activeOpacity={0.7}
          >
            <View style={styles.shutterButtonInner}>
              <Camera size={18} color="#000000" />
            </View>
          </TouchableOpacity>

          {/* Botón Apartar en Probador Físico */}
          <TouchableOpacity
            onPress={handleReservePhysical}
            style={styles.reserveButton}
            activeOpacity={0.85}
          >
            <CalendarClock size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.reserveButtonText}>
              Apartar Talla {selectedSize} en Probador
            </Text>
          </TouchableOpacity>

          {/* Botón Compra Directa */}
          <TouchableOpacity
            onPress={handleAddToCart}
            style={styles.cartButton}
            activeOpacity={0.85}
          >
            <ShoppingBag size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  cameraFlashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    zIndex: 99,
  },
  cameraViewport: {
    flex: 1,
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#09090B',
  },
  webViewLayer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  fallbackBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#09090B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bodySilhouetteGuide: {
    width: 220,
    height: 330,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(168, 85, 247, 0.35)',
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.35,
  },
  silhouetteHead: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 1.5,
    borderColor: 'rgba(192, 132, 252, 0.4)',
    marginBottom: 8,
  },
  silhouetteTorso: {
    width: 155,
    height: 180,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(192, 132, 252, 0.4)',
  },
  silhouetteLegs: {
    width: 135,
    height: 100,
    marginTop: 6,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(52, 211, 153, 0.4)',
  },
  headerBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerCircleButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackingBadge: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trackingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  trackingBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rotationHintBadge: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    zIndex: 30,
    backgroundColor: 'rgba(15, 15, 20, 0.90)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.45)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },
  rotationHintText: {
    color: '#E9D5FF',
    fontSize: 10,
    fontWeight: '600',
    maxWidth: SCREEN_WIDTH * 0.55,
  },
  retryScanMiniButton: {
    backgroundColor: '#7E22CE',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 12,
  },
  retryScanMiniButtonText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  floatingControlsPanel: {
    position: 'absolute',
    right: 14,
    top: 75,
    zIndex: 40,
    backgroundColor: 'rgba(10, 10, 15, 0.75)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    padding: 7,
    alignItems: 'center',
    gap: 7,
  },
  floatingControlsTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#9CA3AF',
    marginBottom: 2,
  },
  controlMiniButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlDivider: {
    width: 16,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginVertical: 1,
  },
  bottomPanelContainer: {
    backgroundColor: '#09090B',
    borderTopWidth: 1,
    borderTopColor: '#27272A',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
  },
  productInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  productTitleText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  categoryBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  productPriceText: {
    color: '#A1A1AA',
    fontSize: 10,
  },
  arCertifiedTag: {
    backgroundColor: 'rgba(147, 51, 234, 0.25)',
    borderColor: '#A855F7',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  arCertifiedTagText: {
    color: '#D8B4FE',
    fontSize: 8,
    fontWeight: 'bold',
  },
  sizeSelectorRow: {
    flexDirection: 'row',
    gap: 5,
  },
  sizeChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  sizeChipActive: {
    backgroundColor: '#9333EA',
    borderColor: '#C084FC',
  },
  sizeChipInactive: {
    backgroundColor: '#18181B',
    borderColor: '#3F3F46',
  },
  sizeChipText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  sizeChipTextActive: {
    color: '#FFFFFF',
  },
  sizeChipTextInactive: {
    color: '#A1A1AA',
  },
  colorVariantsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
  },
  colorVariantsLabel: {
    color: '#9CA3AF',
    fontSize: 10,
    fontWeight: '600',
  },
  colorDotButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    borderRadius: 12,
    paddingHorizontal: 7,
    paddingVertical: 3,
    gap: 5,
  },
  colorDotButtonActive: {
    borderColor: '#C084FC',
    backgroundColor: 'rgba(88, 28, 135, 0.4)',
  },
  colorDotFill: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  colorDotText: {
    color: '#D4D4D8',
    fontSize: 9,
  },
  garmentsScrollView: {
    marginVertical: 6,
  },
  garmentsScrollContent: {
    gap: 8,
    paddingHorizontal: 2,
  },
  garmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    borderRadius: 14,
    borderWidth: 1,
    width: 140,
  },
  garmentCardActive: {
    backgroundColor: 'rgba(88, 28, 135, 0.5)',
    borderColor: '#A855F7',
  },
  garmentCardInactive: {
    backgroundColor: '#18181B',
    borderColor: '#27272A',
  },
  garmentCardImage: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#27272A',
    marginRight: 8,
  },
  garmentCardTitle: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  garmentCardTitleActive: {
    color: '#E9D5FF',
  },
  garmentCardTitleInactive: {
    color: '#D4D4D8',
  },
  garmentCardPrice: {
    fontSize: 9,
    color: '#A1A1AA',
    fontFamily: 'monospace',
    marginTop: 1,
  },
  actionsBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  shutterButtonOuter: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  shutterButtonInner: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reserveButton: {
    flex: 1,
    height: 46,
    backgroundColor: '#9333EA',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#9333EA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  reserveButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  cartButton: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionScreen: {
    flex: 1,
    backgroundColor: '#09090B',
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionBackButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#18181B',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.25)',
  },
  permissionIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(168, 85, 247, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 10,
  },
  permissionDescription: {
    fontSize: 14,
    color: '#A1A1AA',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 26,
  },
  permissionPrimaryButton: {
    width: '100%',
    height: 48,
    backgroundColor: '#9333EA',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  permissionPrimaryButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  permissionSecondaryButton: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionSecondaryButtonText: {
    color: '#71717A',
    fontSize: 13,
  },
});
