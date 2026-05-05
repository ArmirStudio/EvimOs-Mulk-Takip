# Kurulum Rehberi (Windows)

Uygulamanın hem arayüzünü (frontend) hem de sunucu tarafını (backend) çalıştırabilmek için Node.js ve Python kurulumlarını yapmanız gerekmektedir.

## 1. Node.js ve npm Kurulumu (Arayüz İçin)
Arayüz tarafı Expo ve React Native kullandığı için Node.js gereklidir.

1.  **İndirme**: [nodejs.org](https://nodejs.org/en) adresine gidin ve **LTS (Long Term Support)** versiyonunu indirin.
2.  **Kurulum**: İndirdiğiniz `.msi` dosyasını çalıştırın.
3.  **ÖNEMLİ**: Kurulum sırasında **"Add to PATH"** seçeneğinin işaretli olduğundan emin olun.
4.  **Doğrulama**: PowerShell veya CMD açın ve şu komutları yazın:
    ```powershell
    node -v
    npm -v
    ```

## 2. Python Kurulumu (Sunucu İçin)
Sunucu tarafı FastAPI kullandığı için Python 3.8 veya üzeri bir sürüm gereklidir.

1.  **İndirme**: [python.org](https://www.python.org/downloads/windows/) adresinden en son Python 3.x sürümünü indirin.
2.  **Kurulum**: Yükleyiciyi çalıştırın.
3.  **KRİTİK**: İlk ekranda en altta bulunan **"Add Python to PATH"** kutucuğunu mutlaka işaretleyin. Bu işaretlenmezse komut satırından python'a erişemezsiniz.
4.  **Doğrulama**: Yeni bir PowerShell açın ve şunu yazın:
    ```powershell
    python --version
    ```

## 3. Kurulum Sonrası İşlemler
Kurulumlar bittikten sonra projeyi çalıştırmak için:

### Arayüz (Frontend)
```powershell
cd frontend
npm install
npx expo start
```

### Sunucu (Backend)
```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python server.py
```

> [!TIP]
> Kurulumları tamamladıktan sonra terminalinizi (PowerShell/CMD) kapatıp açmanız gerekebilir.
