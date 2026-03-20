# Chibi Pelusa 🤖✨
**Motor Híbrido de NLU y Aprendizaje No Supervisado en Entorno Serverless (V8)**

![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E)
![Google Apps Script](https://img.shields.io/badge/google%20apps%20script-%234285F4.svg?style=for-the-badge&logo=google&logoColor=white)
![No Dependencies](https://img.shields.io/badge/dependencies-0-success?style=for-the-badge)
![Zero Cost](https://img.shields.io/badge/Inference%20Cost-$0.00-brightgreen?style=for-the-badge)

> **Creadora y Arquitecta de Software:** Selene Jimenez  
> **Copyright (c) 2026.** Todos los derechos reservados sobre el diseño arquitectónico y lógica nativa.

---

## 📖 Resumen Ejecutivo
**Chibi Pelusa** no es un wrapper de una API comercial. Es un motor de Inteligencia Artificial nativo construido desde cero para operar en entornos con recursos computacionales extremadamente limitados (Google Apps Script). 

El sistema combina **Cadenas de Markov** (Generación de texto), un **Motor NLU propio basado en heurística y puntuación léxica** (Comprensión), y un **Grafo Semántico Hebbiano** (Aprendizaje Automático No Supervisado en tiempo real). Logra inferencia a coste cero ($0.00) eliminando la dependencia constante de LLMs en la nube para el diálogo transaccional.

## 🚀 Ruptura de Paradigmas Técnicos y Arquitectura
Este proyecto supera las estrictas cuotas de ejecución y memoria de Google (V8) implementando patrones de diseño de alta ingeniería:

* **🧠 Grafo Semántico Nativo (Teoría de Hebb):** Construye redes neuronales matemáticas (`grafo_semantico.json`) relacionando conceptos en tiempo real basados puramente en la interacción del usuario, sin requerir costosas bases de datos vectoriales.
* **🗃️ Sharding Dinámico (Particionamiento):** Evita el colapso de RAM (Out of Memory) al dividir la matriz de conocimiento en múltiples fragmentos JSON autogestionados y enlazados por UUIDs. Escalabilidad horizontal infinita sobre Google Drive.
* **🚦 Control de Concurrencia (Mutex/Locks):** Implementación de `LockService` para gestionar condiciones de carrera (*Race Conditions*). El sistema orquesta lecturas concurrentes libres y encola escrituras, garantizando la integridad de datos bajo tráfico masivo.
* **🔄 Máquina de Estados y Multitarea:** Abandona el flujo de chat lineal mediante un gestor de caché (`CacheService`), permitiendo pausar diálogos, ejecutar inyecciones de datos estructuradas interactuando con UI, y retomar el contexto original.
* **🎓 Asincronismo Estratégico ("Human-in-the-Loop"):** Uso de LLMs (Gemini) *únicamente* como orquestadores de entrenamiento en el módulo de la "Escuelita". Una vez estructurado el corpus, el modelo comercial se desconecta y la inferencia vuelve a ser 100% nativa.

## 💡 El Caso de Negocio: Edge AI y SLMs
Chibi Pelusa es una prueba de concepto exitosa sobre la viabilidad de los **Small Language Models (SLMs)** y el **Edge AI**. Demuestra que para el 80% de las tareas automatizables (Customer Service, FAQs, EdTech) no es necesario depender de inferencia en la nube. 

**Ventajas clave:**
1. **Inferencia Zero-Cost:** Una vez entrenada, procesa infinitos tokens sin coste de API.
2. **Data Sovereignty (Privacidad Absoluta):** La PII (Información Personal Identificable) nunca sale del clúster local para ser procesada por terceros.
3. **Cero Alucinaciones:** El modelo de Bigramas está acotado estrictamente a su base de conocimiento inyectada.

## 🛠️ Instalación y Despliegue
Este proyecto está diseñado para ejecutarse nativamente en el ecosistema gratuito de Google Workspace.
1. Crear un proyecto en Google Apps Script.
2. Añadir los archivos core: `Código.gs`, `Core_NLU.gs` y la interfaz `Index.html`.
3. Ejecutar la función `setupDatabase()` para que el sistema construya su propio clúster NoSQL sobre el ID de carpeta proporcionado.
4. Desplegar como Aplicación Web (Web App).

## Nota
Para utilizar la funcionalidad de entrenamiento de escuelita con Gemini se debe usar una API Key válida.

## 📄 Licencia
Este proyecto es una iniciativa de investigación técnica y arquitectura de software. 
Se autoriza la inspección del código con fines educativos y de revisión. Para usos comerciales, modificaciones o implementaciones derivadas, se requiere el consentimiento explícito de la autora (**Selene Jimenez**).
