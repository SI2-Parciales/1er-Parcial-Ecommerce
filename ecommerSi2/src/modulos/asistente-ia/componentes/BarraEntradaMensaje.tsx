import React from 'react';
import { View, TextInput, TouchableOpacity } from 'react-native';
import { Mic, MicOff, Send } from 'lucide-react-native';

export interface BarraEntradaMensajeProps {
  inputText: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  isListening: boolean;
  onToggleVoice: () => void;
}

export const BarraEntradaMensaje: React.FC<BarraEntradaMensajeProps> = ({
  inputText,
  onChangeText,
  onSend,
  isListening,
  onToggleVoice,
}) => {
  const canSend = inputText.trim().length > 0;

  return (
    <View className="bg-white border-t border-gray-200 px-3 py-2.5 flex-row items-center">
      <TouchableOpacity
        onPress={onToggleVoice}
        className={`w-10 h-10 rounded-full items-center justify-center mr-2 ${
          isListening ? 'bg-red-500' : 'bg-gray-100'
        }`}
        accessibilityLabel="Activar micrófono"
      >
        {isListening ? (
          <MicOff size={20} color="#FFFFFF" />
        ) : (
          <Mic size={20} color="#4B5563" />
        )}
      </TouchableOpacity>

      <TextInput
        value={inputText}
        onChangeText={onChangeText}
        placeholder="Pregunta por un outfit, talla o evento..."
        placeholderTextColor="#9CA3AF"
        className="flex-1 bg-gray-100 rounded-full px-4 py-2.5 text-sm text-gray-900 mr-2"
        onSubmitEditing={onSend}
        returnKeyType="send"
      />

      <TouchableOpacity
        onPress={onSend}
        disabled={!canSend}
        className={`w-10 h-10 rounded-full items-center justify-center ${
          canSend ? 'bg-blue-600' : 'bg-gray-200'
        }`}
        accessibilityLabel="Enviar mensaje"
      >
        <Send size={18} color={canSend ? '#FFFFFF' : '#9CA3AF'} />
      </TouchableOpacity>
    </View>
  );
};
