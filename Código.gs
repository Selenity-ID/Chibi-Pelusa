/*
 * Proyecto: Chibi Pelusa (Motor NLU y Markov Nativo)
 * Creadora y Arquitecta: Selene Jimenez
 * Copyright (c) 2026. Todos los derechos reservados.
 */

// ==========================================
// CONFIGURACIÓN GLOBAL Y LÍMITES
// ==========================================
const ROOT_FOLDER_ID = '14e2HHNUTL-vibUBAlPjYpVGAwmCEY87Y';
const KNOWLEDGE_PREFIX = 'conocimiento_markov'; 
const MAX_TOPICS_PER_FILE = 50; // Cuando llegue a 50 temas, creará un JSON nuevo
const FALLBACK_FILE_NAME = 'frases_graciosas.json';
const BOLETIN_FILE_NAME = 'boletin.json';
const GRAPH_FILE_NAME = 'grafo_semantico.json';
const STOPWORDS_FILE_NAME = 'stopwords.json';

const DEFAULT_FALLBACKS = [
  "Mi matriz de probabilidad está vacía para eso.",
  "404: Conocimiento no encontrado. Pero tengo mucho carisma.",
  "No sé qué significa eso... ¡pero suena a magia!"
];

const DEFAULT_STOPWORDS = ["el","la","los","las","un","una","y","o","pero","de","del","al","en","por","para","con","como","que","es","son","estoy","tengo","muy","mas","me","te","se","mi","tu","su","a","si","no","ayer","fui","estaba","hace"];

// ==========================================
// 1. SISTEMA DE ARCHIVOS Y SHARDING
// ==========================================
function setupDatabase() {
  const folder = DriveApp.getFolderById(ROOT_FOLDER_ID);
  
  if (!folder.searchFiles("title = '" + KNOWLEDGE_PREFIX + "_1.json'").hasNext()) {
    folder.createFile(KNOWLEDGE_PREFIX + "_1.json", JSON.stringify([]), MimeType.PLAIN_TEXT);
  }

  const filesToCreate = [
    { name: FALLBACK_FILE_NAME, content: DEFAULT_FALLBACKS },
    { name: BOLETIN_FILE_NAME, content: [] },
    { name: GRAPH_FILE_NAME, content: {} },
    { name: STOPWORDS_FILE_NAME, content: DEFAULT_STOPWORDS }
  ];
  
  filesToCreate.forEach(function(f) {
    if (!folder.searchFiles("title = '" + f.name + "'").hasNext()) {
      folder.createFile(f.name, JSON.stringify(f.content), MimeType.PLAIN_TEXT);
    }
  });
}

function getDatabase(fileName) {
  const folder = DriveApp.getFolderById(ROOT_FOLDER_ID);
  const files = folder.searchFiles("title = '" + fileName + "'");
  if (files.hasNext()) {
    return JSON.parse(files.next().getBlob().getDataAsString());
  }
  return null;
}

function saveDatabase(fileName, data) {
  const folder = DriveApp.getFolderById(ROOT_FOLDER_ID);
  const files = folder.searchFiles("title = '" + fileName + "'");
  if (files.hasNext()) {
    files.next().setContent(JSON.stringify(data));
  } else {
    folder.createFile(fileName, JSON.stringify(data), MimeType.PLAIN_TEXT);
  }
}

// Une todos los fragmentos JSON de conocimiento en memoria
function getKnowledgeDatabases() {
  const folder = DriveApp.getFolderById(ROOT_FOLDER_ID);
  const files = folder.searchFiles("title contains '" + KNOWLEDGE_PREFIX + "'");
  let allKnowledge = [];
  while (files.hasNext()) {
    let fileData = JSON.parse(files.next().getBlob().getDataAsString() || "[]");
    allKnowledge = allKnowledge.concat(fileData);
  }
  return allKnowledge;
}

function guardarNuevoConocimiento(topic, keywords, corpus) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // Espera en fila hasta 10 segundos
    const folder = DriveApp.getFolderById(ROOT_FOLDER_ID);
    const files = folder.searchFiles("title contains '" + KNOWLEDGE_PREFIX + "'");
    let fileList = [];
    while (files.hasNext()) fileList.push(files.next());
    
    fileList.sort((a, b) => a.getName().localeCompare(b.getName()));
    let latestFile = fileList[fileList.length - 1];
    
    const uniqueId = "topic_" + new Date().getTime();
    const lowerKeywords = keywords.map(function(k) { return k.toLowerCase(); });

    const newEntry = {
      id: uniqueId,
      topic: topic,
      keywords: lowerKeywords,
      corpus: corpus,
      markov_model: buildMarkovChain(corpus)
    };

    let currentData = JSON.parse(latestFile.getBlob().getDataAsString() || "[]");
    
    if (currentData.length >= MAX_TOPICS_PER_FILE) {
      let newIndex = fileList.length + 1;
      folder.createFile(KNOWLEDGE_PREFIX + "_" + newIndex + ".json", JSON.stringify([newEntry]), MimeType.PLAIN_TEXT);
    } else {
      currentData.push(newEntry);
      latestFile.setContent(JSON.stringify(currentData));
    }
    return uniqueId;
  } catch (e) {
    console.error("Error de concurrencia", e);
    return null;
  } finally {
    lock.releaseLock(); // Siempre libera la llave, incluso si hay error
  }
}

// ==========================================
// 2. MODELOS MATEMÁTICOS DE MARKOV
// ==========================================
function buildMarkovChain(sentences) {
  const chain = { "_START_": [] };
  sentences.forEach(function(sentence) {
    const words = sentence.trim().split(/\s+/);
    if (words.length < 2) return;
    const startState = words[0] + " " + words[1];
    chain["_START_"].push(startState);
    for (let i = 0; i < words.length - 1; i++) {
      let currState = words[i] + " " + words[i + 1];
      let nextWord = (i < words.length - 2) ? words[i + 2] : "_END_";
      if (!chain[currState]) chain[currState] = [];
      chain[currState].push(nextWord);
    }
  });
  return chain;
}

function generarFraseMarkovAtenta(chain, preferredStart, contextSentence) {
  let contextWords = contextSentence ? contextSentence.toLowerCase().split(/\s+/) : [];

  for (let intento = 0; intento < 10; intento++) {
    if (!chain["_START_"] || chain["_START_"].length === 0) return "Mis tokens están vacíos.";
    
    let startState;
    if (intento < 3 && preferredStart && chain["_START_"].includes(preferredStart)) {
      startState = preferredStart;
    } else {
      startState = chain["_START_"][Math.floor(Math.random() * chain["_START_"].length)];
    }
    
    let generatedWords = startState.split(" ");
    let limit = 0;
    
    while (limit < 30) {
      let currState = generatedWords[generatedWords.length - 2] + " " + generatedWords[generatedWords.length - 1];
      let nextWords = chain[currState];
      if (!nextWords || nextWords.length === 0) break;
      
      let palabrasValidas = nextWords.filter(function(w) {
        let palabraLimpia = w.toLowerCase().replace(/[^a-záéíóúñ]/g, '');
        if (palabraLimpia.length > 3) {
          return !generatedWords.some(gw => gw.toLowerCase().replace(/[^a-záéíóúñ]/g, '') === palabraLimpia);
        }
        return true;
      });
      
      if (palabrasValidas.length === 0) palabrasValidas = nextWords;
      
      let nextWord;
      let palabrasContexto = palabrasValidas.filter(w => contextWords.includes(w.toLowerCase().replace(/[^a-záéíóúñ]/g, '')));
      
      if (palabrasContexto.length > 0 && Math.random() > 0.3) {
        nextWord = palabrasContexto[Math.floor(Math.random() * palabrasContexto.length)];
      } else {
        nextWord = palabrasValidas[Math.floor(Math.random() * palabrasValidas.length)];
      }
      
      if (nextWord === "_END_") break;
      generatedWords.push(nextWord);
      limit++;
    }
    if (generatedWords.length >= 4) return generatedWords.join(" ");
  }
  return "Tengo los tokens un poco desordenados hoy. Intenta preguntarme de nuevo.";
}

// ==========================================
// 3. FASE DE INFERENCIA (CHAT NATIVO MULTITAREA Y NLU)
// ==========================================
function chatWithNativeBot(userMessage) {
  let msgLower = userMessage.toLowerCase().trim();
  const cache = CacheService.getUserCache();
  let respuestaFinal = ""; 

  // --- 0. INTERVENCIÓN NLU (Capa Base de Sentido Común) ---
  if (typeof procesarNLU === 'function') {
    const analisisNLU = procesarNLU(userMessage);
    const respuestaCapaBase = generarRespuestaCapaBase(analisisNLU);
    if (respuestaCapaBase) return respuestaCapaBase;
  }
  // --------------------------------------------------------

// --- 1. MÁQUINA DE ESTADOS (INGRESO DE DATOS ESTRUCTURADO CON BOTONES) ---
  const learningState = cache.get("learning_state");

  // Salida de emergencia
  if (learningState && (msgLower === "cancelar" || msgLower === "salir")) {
    cache.removeAll(["learning_state", "learn_topic", "learn_keywords", "learn_corpus"]);
    return "¡Modo aprendizaje cancelado! Volvemos a la programación habitual. 🤖";
  }

  // Paso 1: Recibe el tema
  if (learningState === "esperando_tema") {
    cache.put("learn_topic", userMessage, 300);
    cache.put("learning_state", "esperando_claves", 300);
    return "¡Anotado! El tema será: *" + userMessage + "*. <br>Ahora dime 2 o 3 palabras clave separadas por comas. <br><br><button class='chat-action-btn btn-cancel' onclick='sendChatFromButton(\"cancelar\")'>Cancelar Aprendizaje</button>";
  }

  // Paso 2: Recibe las claves
  if (learningState === "esperando_claves") {
    cache.put("learn_keywords", msgLower, 300);
    cache.put("learn_corpus", JSON.stringify([]), 300);
    cache.put("learning_state", "esperando_oracion", 300);
    return "¡Claves indexadas! Para no confundirme con los puntos, vamos a agregar las respuestas una por una. <br>Escribe la **PRIMERA** oración de tu explicación: <br><br><button class='chat-action-btn btn-cancel' onclick='sendChatFromButton(\"cancelar\")'>Cancelar Aprendizaje</button>";
  }

  // Paso 3: Bucle de oraciones
  if (learningState === "esperando_oracion") {
    // Limpiamos formato por si el usuario insiste en escribirlo a mano
    let comandoLimpio = msgLower.replace(/[*"'.\-]/g, "").trim();

    if (comandoLimpio === "terminar" || comandoLimpio === "listo") {
      let corpus = JSON.parse(cache.get("learn_corpus") || "[]");
      if (corpus.length === 0) return "No has agregado ninguna oración. Escribe al menos una o presiona Cancelar. <br><br><button class='chat-action-btn btn-cancel' onclick='sendChatFromButton(\"cancelar\")'>Cancelar</button>";
      
      let topic = cache.get("learn_topic");
      let keywords = cache.get("learn_keywords").split(",").map(function(k) { return k.trim(); });
      
      guardarNuevoConocimiento(topic, keywords, corpus);
      cache.removeAll(["learning_state", "learn_topic", "learn_keywords", "learn_corpus"]);
      
      const userName = cache.get("user_name") || "humana";
      return "¡Bip bop! 🧠 Matriz actualizada con éxito con " + corpus.length + " oraciones. ¡Gracias, " + userName + "!";
    } else {
      let corpus = JSON.parse(cache.get("learn_corpus") || "[]");
      corpus.push(userMessage.trim()); 
      cache.put("learn_corpus", JSON.stringify(corpus), 300);
      
      // AQUÍ ESTÁ LA MAGIA: Botones interactivos para Terminar o Cancelar
      return "Oración #" + corpus.length + " guardada. Escribe la SIGUIENTE oración, o presiona Terminar para guardar. <br><br><button class='chat-action-btn' onclick='sendChatFromButton(\"terminar\")'>✔️ Terminar y Guardar</button> <button class='chat-action-btn btn-cancel' onclick='sendChatFromButton(\"cancelar\")'>❌ Cancelar</button>";
    }
  }

  // 2. Aprender nombres
  const nameMatch = msgLower.match(/(?:me llamo|mi nombre es|soy)\s+([a-záéíóúñ]+)/i);
  if (nameMatch) {
    let nombre = nameMatch[1];
    nombre = nombre.charAt(0).toUpperCase() + nombre.slice(1);
    cache.put("user_name", nombre, 21600);
    return "¡Encantada de conocerte, " + nombre + "! Ya guardé tu nombre en mi caché.";
  }
  
  // 3. Matemáticas
  const mathMatch = msgLower.match(/^[¿¡]?(?:cu[aá]nto es|calcula|resuelve)?\s*([\d\s+\-*\/\(\)\.]+)[?]?$/i);
  if (mathMatch && mathMatch[1].trim().length > 2 && /[0-9]/.test(mathMatch[1])) {
    try {
      const ecuacionLimpiada = mathMatch[1].replace(/[^()\d+*\-.\/]/g, '');
      const resultado = new Function('return ' + ecuacionLimpiada)();
      return "¡Mis circuitos calculan que es " + resultado + "!";
    } catch(e) {}
  }
  
  // 4. Saludos (Multitarea Mejorada)
  const saludoMatch = msgLower.match(/^(hola|holis|buenas|saludos|chibi pelusa|pelusa)[!.,]?\s*(?:chibi pelusa|pelusa)?\s*/i);
  if (saludoMatch) {
    const userName = cache.get("user_name");
    respuestaFinal = userName ? "¡Hola " + userName + "! " : "¡Hola! Soy Chibi Pelusa. ";
    msgLower = msgLower.replace(saludoMatch[0], "").trim();
    if (msgLower === "") return respuestaFinal + "¿De qué charlamos hoy?";
  }
  
  // 5. Memoria de Conversación
  let words = msgLower.split(/\s+/);
  let ultimoTema = cache.get("last_topic");
  if (ultimoTema && words.length <= 5) {
    msgLower = msgLower + " " + ultimoTema;
    words = msgLower.split(/\s+/);
  }
  
  // 6. Búsqueda en la matriz
  const knowledgeDB = getKnowledgeDatabases();
  let bestMatch = null;
  let maxCoincidences = 0;
  
  for (let i = 0; i < knowledgeDB.length; i++) {
    let entry = knowledgeDB[i];
    let coincidences = 0;
    for (let j = 0; j < entry.keywords.length; j++) {
      let keyword = entry.keywords[j];
      let matchFound = words.some(function(w) { 
        if (keyword.length <= 3) return w === keyword;
        return w.includes(keyword) || keyword.includes(w); 
      });
      if (matchFound) coincidences++;
    }
    if (coincidences > maxCoincidences) {
      maxCoincidences = coincidences;
      bestMatch = entry;
    }
  }
  
  // 7. Generación Markoviana con Atención
  if (bestMatch && maxCoincidences > 0) {
    cache.put("last_topic", bestMatch.keywords.join(" "), 300);
    
    let semillaPreferida = null;
    let oracionContexto = "";
    let maxMatchSemilla = 0;
    
    if (bestMatch.corpus) {
      for (let k = 0; k < bestMatch.corpus.length; k++) {
        let oracion = bestMatch.corpus[k];
        let oracionLower = oracion.toLowerCase();
        let matches = 0;
        
        for (let w = 0; w < words.length; w++) {
          if (words[w].length > 3 && oracionLower.includes(words[w])) matches++;
        }
        
        if (matches > maxMatchSemilla) {
          maxMatchSemilla = matches;
          oracionContexto = oracion;
          let tokens = oracion.trim().split(/\s+/);
          if (tokens.length >= 2) semillaPreferida = tokens[0] + " " + tokens[1];
        }
      }
    }
    
    let frase = generarFraseMarkovAtenta(bestMatch.markov_model, semillaPreferida, oracionContexto);
    if (frase.includes("tokens un poco desordenados") && bestMatch.corpus && bestMatch.corpus.length > 0) {
      frase = bestMatch.corpus[Math.floor(Math.random() * bestMatch.corpus.length)];
    }
    return respuestaFinal + frase;
  }
  
  // 8. Fallback
  cache.put("learning_state", "esperando_tema", 300);
  const fallbacks = getDatabase(FALLBACK_FILE_NAME);
  const randomFallback = fallbacks[Math.floor(Math.random() * fallbacks.length)];
  
  // AQUÍ ESTÁ EL CAMBIO: Usamos <br> y el botón de "No, gracias"
  return respuestaFinal + randomFallback + " Pero me encantaría aprenderlo para mi base de datos. <br><br>Primero: ¿Cuál es el título o nombre exacto de este tema? <br><br><button class='chat-action-btn btn-cancel' onclick='sendChatFromButton(\"cancelar\")'>No, gracias</button>";
}

// ==========================================
// 4. ESCUELITA ASÍNCRONA (TIEMPO REAL BLINDADO)
// ==========================================
function iniciarClaseAsincrona(topic) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + apiKey;
  const prompt = 'Eres la estricta pero tierna Maestra Ninfa enseñando "' + topic + '" a Chibi Pelusa. Responde ÚNICA Y ESTRICTAMENTE con este JSON: { "saludo": "Tu saludo inicial", "corpus": ["oracion 1", "oracion 2", "oracion 3", "oracion 4"], "pregunta_inicial": "Pregunta de evaluación OBJETIVA cuya respuesta esté literalmente dentro del corpus. PROHIBIDO hacer preguntas de sí/no o preguntas personales." }';
  
  const payload = { "contents": [{"parts": [{"text": prompt}]}] };
  const options = { "method": "post", "contentType": "application/json", "payload": JSON.stringify(payload) };
  
  const response = UrlFetchApp.fetch(url, options);
  let rawText = JSON.parse(response.getContentText()).candidates[0].content.parts[0].text;
  
  let startIndex = rawText.indexOf('{');
  let endIndex = rawText.lastIndexOf('}');
  let claseNinfa;
  
  if (startIndex !== -1 && endIndex !== -1) {
    claseNinfa = JSON.parse(rawText.substring(startIndex, endIndex + 1));
  } else {
    throw new Error("Gemini no devolvió un JSON válido.");
  }
  
  const keywordsArray = topic.toLowerCase().split(" ").filter(function(w) { return w.length > 3; });
  const uniqueId = guardarNuevoConocimiento(topic, keywordsArray, claseNinfa.corpus);
  
  return { 
    texto: claseNinfa.saludo + " <br><br> " + claseNinfa.corpus.join(" "), 
    pregunta: claseNinfa.pregunta_inicial,
    index_tema: uniqueId 
  };
}

function pelusaRespondeClaseAsincrona(preguntaNinfa, idTema) {
  const allDB = getKnowledgeDatabases();
  const bestMatch = allDB.find(e => e.id === idTema);
  
  if (bestMatch) {
    let oracionContexto = "";
    let maxMatch = 0;
    const palabrasPregunta = preguntaNinfa.toLowerCase().split(/\s+/);
    
    if (bestMatch.corpus) {
      for (let i = 0; i < bestMatch.corpus.length; i++) {
        let oracion = bestMatch.corpus[i].toLowerCase();
        let matches = 0;
        for (let p = 0; p < palabrasPregunta.length; p++) {
          if (palabrasPregunta[p].length > 3 && oracion.includes(palabrasPregunta[p])) matches++;
        }
        if (matches > maxMatch) {
          maxMatch = matches;
          oracionContexto = bestMatch.corpus[i];
        }
      }
    }
    let frase = generarFraseMarkovAtenta(bestMatch.markov_model, null, oracionContexto);
    if (frase.includes("tokens un poco desordenados") && bestMatch.corpus) {
      return bestMatch.corpus[Math.floor(Math.random() * bestMatch.corpus.length)];
    }
    return frase;
  }
  return "Profesora, se me borró la caché mental.";
}

function ninfaEvaluaAsincrona(pregunta, respuesta) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + apiKey;
  const prompt = 'Actúa como la estricta pero tierna Maestra Ninfa. Preguntaste a Pelusa: "' + pregunta + '". Ella respondió: "' + respuesta + '". \n\nREGLA DE ORO: Si su respuesta NO RESPONDE DIRECTAMENTE a lo que preguntaste, reprueba (aprobado: false y nota menor a 5). No importa si su oración es bonita o cierta; debe responder a la pregunta. \n\nResponde ÚNICA Y EXCLUSIVAMENTE con este JSON: { "aprobado": true/false, "nota": 1 al 10, "feedback": "Tu evaluación hablándole a Pelusa", "nueva_pregunta": "Si false otra pregunta para guiarla, si true vacio" }';
  
  const payload = { "contents": [{"parts": [{"text": prompt}]}] };
  const options = { "method": "post", "contentType": "application/json", "payload": JSON.stringify(payload) };
  
  const response = UrlFetchApp.fetch(url, options);
  let rawText = JSON.parse(response.getContentText()).candidates[0].content.parts[0].text;
  
  let startIndex = rawText.indexOf('{');
  let endIndex = rawText.lastIndexOf('}');
  
  if (startIndex !== -1 && endIndex !== -1) {
    return JSON.parse(rawText.substring(startIndex, endIndex + 1));
  } else {
    return { 
      aprobado: false, 
      nota: 1, 
      feedback: "Hubo una interferencia cósmica. ¿Podemos intentarlo de nuevo?", 
      nueva_pregunta: pregunta 
    };
  }
}

function guardarBoletin(topic, nota, intentos, aprobado, comentario) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const boletin = getDatabase(BOLETIN_FILE_NAME) || [];
    boletin.push({ 
      fecha: new Date().toLocaleString('es-AR'), 
      tema: topic, 
      nota: nota, 
      intentos: intentos, 
      aprobado: aprobado, 
      comentario: comentario 
    });
    saveDatabase(BOLETIN_FILE_NAME, boletin);
    return "Boletín guardado";
  } catch (e) {
    return "Error al guardar el boletín por alta concurrencia.";
  } finally {
    lock.releaseLock();
  }
}

// Mantenemos esta función intacta para que Pelusa pueda leer
function getStopwords() { 
  return getDatabase(STOPWORDS_FILE_NAME) || DEFAULT_STOPWORDS; 
}

function updateStopwords(wordsStr) { 
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const arr = wordsStr.split(',').map(w => w.trim().toLowerCase());
    saveDatabase(STOPWORDS_FILE_NAME, arr);
    return "Stopwords actualizadas.";
  } catch(e) {
    return "Error guardando Stopwords (Timeout).";
  } finally {
    lock.releaseLock();
  }
}

// ==========================================
// 5. RUTAS WEB Y ADMIN (FRONTEND)
// ==========================================
function doGet() { 
  return HtmlService.createHtmlOutputFromFile('Index')
      .setTitle('Panel de Control - Chibi Pelusa')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1'); 
}

function getAdminData() { 
  return getKnowledgeDatabases(); 
}

function getBoletinData() { 
  return getDatabase(BOLETIN_FILE_NAME) || []; 
}

function updateKnowledgeTopic(id, corpusArray, keywordsText) { 
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const folder = DriveApp.getFolderById(ROOT_FOLDER_ID);
    const files = folder.searchFiles("title contains '" + KNOWLEDGE_PREFIX + "'");
    
    while (files.hasNext()) {
      let file = files.next();
      let data = JSON.parse(file.getBlob().getDataAsString() || "[]");
      let index = data.findIndex(e => e.id === id);
      if (index !== -1) {
        data[index].corpus = corpusArray;
        data[index].keywords = keywordsText.split(',').map(x => x.trim().toLowerCase());
        data[index].markov_model = buildMarkovChain(data[index].corpus);
        file.setContent(JSON.stringify(data));
        return "Habilidad actualizada correctamente.";
      }
    }
    return "Error al actualizar la habilidad."; 
  } catch (e) {
    return "Error: Servidor ocupado procesando datos. Intenta de nuevo.";
  } finally {
    lock.releaseLock();
  }
}

function deleteKnowledgeTopic(id) { 
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const folder = DriveApp.getFolderById(ROOT_FOLDER_ID);
    const files = folder.searchFiles("title contains '" + KNOWLEDGE_PREFIX + "'");
    
    while (files.hasNext()) {
      let file = files.next();
      let data = JSON.parse(file.getBlob().getDataAsString() || "[]");
      let index = data.findIndex(e => e.id === id);
      if (index !== -1) {
        data.splice(index, 1);
        file.setContent(JSON.stringify(data));
        return "Habilidad eliminada de la base de datos.";
      }
    }
    return "Error al eliminar."; 
  } catch (e) {
    return "Error: Servidor ocupado procesando datos. Intenta de nuevo.";
  } finally {
    lock.releaseLock();
  }
}
