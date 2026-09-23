import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { ScreenContainer } from '@shared/components/ScreenContainer';
import { Badge } from '@shared/components/Badge';
import { Sparkles, Bot, MapPin, RefreshCw } from 'lucide-react-native';
import { useBranchStore } from '@modulos/sucursales/almacen/branch.store';
import { MOCK_PRODUCTS } from '@modulos/catalogo/datos/mockProducts';
import type { ProductItem } from '@modulos/catalogo/tipos/catalog.types';
import type { BottomTabTabScreenProps } from '@app/navigation/types';
import type { InteraccionIaEntity, FeedbackIaEntity } from '@/types/database.types';
import { SugerenciasRapidasChips } from '../componentes/SugerenciasRapidasChips';
import { BurbujaMensajeIA } from '../componentes/BurbujaMensajeIA';
import { BarraEntradaMensaje } from '../componentes/BarraEntradaMensaje';

interface ChatMessage {
  id: string; // UUID interacciones_ia.id
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  recommendedProducts?: ProductItem[];
  // Mapeo directo a tablas interacciones_ia y feedback_ia (.specs/back-docs)
  interaccion?: InteraccionIaEntity;
  feedback?: FeedbackIaEntity;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-welcome',
    sender: 'assistant',
    text: '¡Hola! Soy tu Asistente de Estilo FashionStore con IA. Puedo recomendarte prendas según tu ocasión, verificar disponibilidad en tu sucursal o ayudarte con tallas y probadores virtuales. ¿En qué te puedo asesorar hoy?',
    timestamp: 'Ahora',
    recommendedProducts: [MOCK_PRODUCTS[0], MOCK_PRODUCTS[1]],
    interaccion: {
      id: 'ia-init-1',
      usuario_id: null,
      tipo: 'CHAT_BIENVENIDA',
      entrada: 'Inicio de sesión / apertura de asistente',
      respuesta: '¡Hola! Soy tu Asistente de Estilo FashionStore con IA...',
      modelo: 'gemini-1.5-flash',
      tokens: 65,
      created_at: new Date().toISOString(),
    },
  },
];

const SUGGESTION_CHIPS = [
  '✦ Outfit formal de gala',
  '◈ Combinación fresca de verano',
  '📍 Stock disponible en mi sucursal',
  '✧ Probador Virtual AR',
  '⏱ Modalidad Pick & Try',
];

export const AIAssistantScreen: React.FC<BottomTabTabScreenProps<'AIAssistantTab'>> = ({
  navigation,
}) => {
  const { activeBranch } = useBranchStore();
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const getAssistantResponse = (query: string): { replyText: string; products?: ProductItem[] } => {
    const q = query.toLowerCase();

    if (q.includes('gala') || q.includes('formal') || q.includes('boda') || q.includes('fiesta') || q.includes('noche')) {
      return {
        replyText:
          'Para una gala o evento formal nocturno, te recomiendo una combinación de alta costura: un vestido de satén con caída elegante o un blazer estructurado slim-fit con solapas de precisión. Ambos combinan perfecto con calzado de piel.',
        products: [MOCK_PRODUCTS[0], MOCK_PRODUCTS[1], MOCK_PRODUCTS[4]],
      };
    }

    if (q.includes('verano') || q.includes('casual') || q.includes('fresca') || q.includes('playa') || q.includes('algodón') || q.includes('lino')) {
      return {
        replyText:
          'Para un día fresco y relajado de verano, la mejor elección son prendas en algodón Oxford y pantalones chinos confort flex. Permiten total transpirabilidad con un look moderno y sofisticado.',
        products: [MOCK_PRODUCTS[2], MOCK_PRODUCTS[3], MOCK_PRODUCTS[5]],
      };
    }

    if (q.includes('stock') || q.includes('sucursal') || q.includes('disponible') || q.includes('tienda')) {
      const branchId = activeBranch.id;
      const inStock = MOCK_PRODUCTS.filter((p) => (p.branchStocks[branchId] ?? 0) > 0);
      return {
        replyText: `Actualmente en tu sucursal seleccionada (${activeBranch.name}), tenemos ${inStock.length} artículos con unidades disponibles de inmediato para retiro o reserva en probador.`,
        products: inStock.slice(0, 3),
      };
    }

    if (q.includes('probador virtual') || q.includes('ar') || q.includes('cámara') || q.includes('3d')) {
      return {
        replyText:
          'El Probador Virtual AR te permite calibrar prendas directamente con tu silueta usando la cámara o tu foto. Entra a cualquier prenda del catálogo y pulsa "Probar en AR" para iniciar la experiencia interactiva.',
        products: [MOCK_PRODUCTS[0], MOCK_PRODUCTS[1]],
      };
    }

    if (q.includes('pick & try') || q.includes('reserva') || q.includes('apartar') || q.includes('cita')) {
      return {
        replyText:
          'Con nuestro sistema "Pick & Try" puedes apartar hasta 5 prendas desde la app. Tu reserva queda guardada durante 2 horas en la sucursal física elegida, con probador exclusivo asignado. Solo presentas tu Pase Digital QR en recepción.',
        products: [MOCK_PRODUCTS[1], MOCK_PRODUCTS[2]],
      };
    }

    // Default intelligent fashion suggestion
    return {
      replyText: `¡Excelente elección! Para esa búsqueda, he seleccionado las prendas más destacadas de la temporada 2026 en ${activeBranch.name}. Todas cuentan con garantía de confección premium y disponibilidad de tallas.`,
      products: [MOCK_PRODUCTS[0], MOCK_PRODUCTS[2]],
    };
  };

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    const userMessage: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: 'Ahora',
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    // Simulate AI response calculation
    setTimeout(() => {
      const response = getAssistantResponse(text);
      const msgId = `msg-ai-${Date.now()}`;
      const aiMessage: ChatMessage = {
        id: msgId,
        sender: 'assistant',
        text: response.replyText,
        timestamp: 'Ahora',
        recommendedProducts: response.products,
        interaccion: {
          id: `ia-${Date.now()}`,
          usuario_id: null,
          tipo: 'CHAT_RECOMENDACION',
          entrada: text,
          respuesta: response.replyText,
          modelo: 'gemini-1.5-flash',
          tokens: 120,
          created_at: new Date().toISOString(),
        },
      };

      setMessages((prev) => [...prev, aiMessage]);
      setIsTyping(false);

      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 150);
    }, 900);
  };

  const handleFeedback = (messageId: string, rating: number) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId) return msg;
        return {
          ...msg,
          feedback: {
            id: `fb-${Date.now()}`,
            interaccion_id: msg.interaccion?.id || msg.id,
            valoracion: rating,
            comentario: rating >= 4 ? 'Respuesta muy útil' : 'Necesita mejorar recomendación',
            creado_en: new Date().toISOString(),
          },
        };
      })
    );
  };

  const handleToggleVoice = () => {
    if (isListening) {
      setIsListening(false);
    } else {
      setIsListening(true);
      // Voice dictation simulation: stops after 2.5s and populates query
      setTimeout(() => {
        setIsListening(false);
        const voiceQueries = [
          '¿Qué prendas elegantes tienen en stock en esta sucursal?',
          'Recomiéndame un vestido formal para evento de noche',
          'Sugerir combinación casual para fin de semana',
        ];
        const randomQuery = voiceQueries[Math.floor(Math.random() * voiceQueries.length)];
        handleSendMessage(randomQuery);
      }, 2500);
    }
  };

  return (
    <ScreenContainer className="bg-gray-50 flex-1" style={{ flex: 1 }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        className="flex-1"
      >
        {/* Header Asistente */}
        <View className="bg-white border-b border-gray-200 px-4 pt-3 pb-3 flex-row items-center justify-between shadow-sm">
          <View className="flex-row items-center flex-1">
            <View className="w-10 h-10 rounded-full bg-brand-primary items-center justify-center mr-3 shadow-sm">
              <Sparkles color="#FFFFFF" size={20} />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center">
                <Text className="text-base font-bold text-gray-900 mr-2">
                  Asistente de Moda IA
                </Text>
                <Badge label="Online" variant="success" size="sm" />
              </View>
              <View className="flex-row items-center mt-0.5">
                <MapPin size={12} color="#6B7280" />
                <Text className="text-xs text-gray-500 ml-1 font-medium" numberOfLines={1}>
                  Stock: {activeBranch.name}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => setMessages(INITIAL_MESSAGES)}
            className="p-2 rounded-full bg-gray-100"
            accessibilityLabel="Reiniciar conversación"
          >
            <RefreshCw size={16} color="#4B5563" />
          </TouchableOpacity>
        </View>

        {/* Banner de dictado de voz activo */}
        {isListening && (
          <View className="bg-amber-500 px-4 py-2 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text className="text-white text-xs font-semibold ml-2">
                Escuchando comando de voz... Habla ahora
              </Text>
            </View>
            <TouchableOpacity onPress={() => setIsListening(false)}>
              <Text className="text-white text-xs font-bold underline">Cancelar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Quick Suggestion Chips Component */}
        <SugerenciasRapidasChips
          chips={SUGGESTION_CHIPS}
          onSelectChip={handleSendMessage}
        />

        {/* Conversación / Mensajes */}
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          className="flex-1 px-4 py-3"
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((msg) => (
            <BurbujaMensajeIA
              key={msg.id}
              msg={msg}
              activeBranchId={activeBranch.id}
              onNavigateDetail={(id) => navigation.navigate('ProductDetail', { productId: id })}
              onNavigateAR={(id) => navigation.navigate('VirtualTryOn', { productId: id })}
              onFeedback={handleFeedback}
            />
          ))}

          {/* Indicador de escritura IA */}
          {isTyping && (
            <View className="flex-row items-center mb-3">
              <View className="w-8 h-8 rounded-full bg-blue-600 items-center justify-center mr-2">
                <Bot size={16} color="#FFFFFF" />
              </View>
              <View className="bg-white border border-gray-200 rounded-2xl rounded-tl-none px-4 py-2.5 flex-row items-center shadow-sm">
                <ActivityIndicator size="small" color="#111827" />
                <Text className="text-xs text-gray-500 ml-2 font-medium">
                  El Asistente está analizando prendas...
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input Bar Component */}
        <BarraEntradaMensaje
          inputText={inputText}
          onChangeText={setInputText}
          onSend={() => handleSendMessage()}
          isListening={isListening}
          onToggleVoice={handleToggleVoice}
        />
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
};
