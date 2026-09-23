import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Bot, User, ChevronRight, Maximize2, ThumbsUp, ThumbsDown } from 'lucide-react-native';
import { Badge } from '@shared/components/Badge';
import type { ProductItem } from '@modulos/catalogo/tipos/catalog.types';
import type { FeedbackIaEntity, InteraccionIaEntity } from '@/types/database.types';

export interface ChatMessageData {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  recommendedProducts?: ProductItem[];
  interaccion?: InteraccionIaEntity;
  feedback?: FeedbackIaEntity;
}

export interface BurbujaMensajeIAProps {
  msg: ChatMessageData;
  activeBranchId: string;
  onNavigateDetail: (productId: string) => void;
  onNavigateAR: (productId: string) => void;
  onFeedback: (messageId: string, rating: number) => void;
}

export const BurbujaMensajeIA: React.FC<BurbujaMensajeIAProps> = ({
  msg,
  activeBranchId,
  onNavigateDetail,
  onNavigateAR,
  onFeedback,
}) => {
  const isMe = msg.sender === 'user';

  return (
    <View className={`mb-4 flex-row ${isMe ? 'justify-end' : 'justify-start'}`}>
      {!isMe && (
        <View className="w-8 h-8 rounded-full bg-blue-600 items-center justify-center mr-2 mt-1">
          <Bot size={16} color="#FFFFFF" />
        </View>
      )}

      <View
        className={`max-w-[85%] rounded-2xl p-3.5 ${
          isMe
            ? 'bg-blue-600 rounded-tr-none'
            : 'bg-white border border-gray-200 rounded-tl-none shadow-sm'
        }`}
      >
        <Text
          className={`text-sm leading-relaxed ${
            isMe ? 'text-white' : 'text-gray-800'
          }`}
        >
          {msg.text}
        </Text>

        {/* Recomendaciones de prendas vinculadas */}
        {msg.recommendedProducts && msg.recommendedProducts.length > 0 && (
          <View className="mt-3 pt-2.5 border-t border-gray-100">
            <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Prendas recomendadas:
            </Text>
            <View className="gap-2">
              {msg.recommendedProducts.map((product) => {
                const stock = product.branchStocks[activeBranchId] ?? 0;
                return (
                  <View
                    key={product.id}
                    className="flex-row items-center bg-gray-50 p-2 rounded-xl border border-gray-200"
                  >
                    <Image
                      source={{ uri: product.images[0] }}
                      className="w-14 h-14 rounded-lg bg-gray-200"
                      resizeMode="cover"
                    />
                    <View className="flex-1 ml-2.5 justify-between">
                      <Text
                        numberOfLines={1}
                        className="text-xs font-bold text-gray-900"
                      >
                        {product.name}
                      </Text>
                      <Text className="text-xs font-semibold text-blue-600 mt-0.5">
                        ${product.basePrice.toFixed(2)} USD
                      </Text>
                      <View className="flex-row items-center mt-1">
                        <Badge
                          label={stock > 0 ? `${stock} en tienda` : 'Sin stock'}
                          variant={stock > 0 ? 'success' : 'danger'}
                          size="sm"
                        />
                      </View>
                    </View>

                    <View className="gap-1 ml-1">
                      <TouchableOpacity
                        onPress={() => onNavigateDetail(product.id)}
                        className="bg-blue-600 px-2 py-1 rounded-md flex-row items-center"
                      >
                        <Text className="text-[10px] font-bold text-white mr-1">
                          Ver
                        </Text>
                        <ChevronRight size={10} color="#FFFFFF" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => onNavigateAR(product.id)}
                        className="bg-gray-200 px-2 py-1 rounded-md flex-row items-center"
                      >
                        <Maximize2 size={10} color="#374151" />
                        <Text className="text-[10px] font-semibold text-gray-700 ml-0.5">
                          AR
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        <View className="flex-row items-center justify-between mt-1.5 pt-1.5 border-t border-gray-100">
          {!isMe ? (
            <View className="flex-row items-center gap-1.5">
              <TouchableOpacity
                onPress={() => onFeedback(msg.id, 5)}
                className={`p-1 rounded-md ${msg.feedback?.valoracion === 5 ? 'bg-green-100' : 'bg-gray-100'}`}
                accessibilityLabel="Valorar útil"
              >
                <ThumbsUp size={11} color={msg.feedback?.valoracion === 5 ? '#059669' : '#6B7280'} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onFeedback(msg.id, 1)}
                className={`p-1 rounded-md ${msg.feedback?.valoracion === 1 ? 'bg-red-100' : 'bg-gray-100'}`}
                accessibilityLabel="Valorar no útil"
              >
                <ThumbsDown size={11} color={msg.feedback?.valoracion === 1 ? '#DC2626' : '#6B7280'} />
              </TouchableOpacity>
              {msg.feedback && (
                <Text className="text-[9px] text-gray-500 font-medium ml-1">
                  {msg.feedback.valoracion === 5 ? '¡Gracias!' : 'Anotado'}
                </Text>
              )}
            </View>
          ) : <View />}

          <Text
            className={`text-[10px] ${
              isMe ? 'text-blue-200' : 'text-gray-400'
            }`}
          >
            {msg.timestamp}
          </Text>
        </View>
      </View>

      {isMe && (
        <View className="w-8 h-8 rounded-full bg-gray-300 items-center justify-center ml-2 mt-1">
          <User size={16} color="#374151" />
        </View>
      )}
    </View>
  );
};
