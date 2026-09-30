from pathlib import Path
import sys


AUDIO_PATH = Path(__file__).resolve().parent / "audio.wav"


def main() -> int:
    if not AUDIO_PATH.is_file():
        print(
            "No se encontró el archivo de audio. "
            f"Coloca un archivo llamado '{AUDIO_PATH.name}' en: {AUDIO_PATH.parent}"
        )
        return 1

    try:
        from faster_whisper import WhisperModel

        print("Cargando el modelo Whisper small en CPU...")
        model = WhisperModel("small", device="cpu", compute_type="int8")
    except Exception as error:
        print(f"No se pudo cargar el modelo Whisper: {error}")
        return 1

    try:
        segments, info = model.transcribe(str(AUDIO_PATH), language="es")
        transcription = " ".join(segment.text.strip() for segment in segments).strip()
    except Exception as error:
        print(f"No se pudo transcribir el audio: {error}")
        return 1

    if not transcription:
        print("La transcripción está vacía. Comprueba que el audio tenga voz audible.")
        return 1

    print(f"Idioma: {info.language}")
    print("Transcripción:")
    print(transcription)
    return 0


if __name__ == "__main__":
    sys.exit(main())
