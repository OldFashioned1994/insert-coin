/* ============================================================================
   INSERT COIN — preguntas.js  (banco de la Trivia de Cine)
   ----------------------------------------------------------------------------
   Cada pregunta tiene:
     cat   → categoría: "hollywood" | "argentino" | "animacion" | "mixto"
     dif   → dificultad: 1 (fácil) · 2 (media) · 3 (difícil)
     q     → la pregunta
     ops   → las 4 opciones
     ok    → índice (0–3) de la opción correcta
     pista → texto que revela el comodín "Pista"
     dato  → curiosidad que se muestra después de responder

   ★ PARA SUMAR PREGUNTAS: copiá un bloque, cambialo y listo. Verificá que "ok"
   apunte a la opción correcta (se cuenta desde 0). Mantené 4 opciones.
   ============================================================================ */

window.TRIVIA_PREGUNTAS = [

  /* ===================== HOLLYWOOD Y SAGAS ===================== */
  { cat:"hollywood", dif:1,
    q:"¿Quién dirigió la trilogía original de 'El Señor de los Anillos'?",
    ops:["Guillermo del Toro","Peter Jackson","Christopher Nolan","James Cameron"], ok:1,
    pista:"Es neozelandés y filmó todo en su país.",
    dato:"Se rodó íntegramente en Nueva Zelanda durante más de un año seguido." },

  { cat:"hollywood", dif:2,
    q:"¿En qué año se estrenó la primera 'Star Wars' (Una nueva esperanza)?",
    ops:["1975","1977","1980","1983"], ok:1,
    pista:"Fue en la segunda mitad de los 70.",
    dato:"Al estrenarse se llamaba solo 'Star Wars'; el 'Episodio IV' se agregó después." },

  { cat:"hollywood", dif:1,
    q:"¿Qué actor interpreta a Iron Man / Tony Stark en el Universo Marvel?",
    ops:["Chris Evans","Robert Downey Jr.","Mark Ruffalo","Chris Hemsworth"], ok:1,
    pista:"Debutó en el papel en 2008.",
    dato:"Su sueldo por película llegó a ser de los más altos de Hollywood." },

  { cat:"hollywood", dif:1,
    q:"¿Quién dirigió 'Titanic' (1997)?",
    ops:["Steven Spielberg","James Cameron","Ridley Scott","Ron Howard"], ok:1,
    pista:"También dirigió 'Avatar'.",
    dato:"Ganó 11 Oscars, récord que comparte con 'Ben-Hur' y 'El retorno del rey'." },

  { cat:"hollywood", dif:2,
    q:"En 'El Padrino', ¿qué actor interpreta a Michael Corleone?",
    ops:["Al Pacino","Robert De Niro","Marlon Brando","Robert Duvall"], ok:0,
    pista:"Años después haría de Tony en 'Scarface'.",
    dato:"Marlon Brando interpreta a Vito, su padre." },

  { cat:"hollywood", dif:2,
    q:"¿Cuál es el nombre del personaje de Anthony Hopkins en 'El silencio de los inocentes'?",
    ops:["Norman Bates","Hannibal Lecter","John Doe","Patrick Bateman"], ok:1,
    pista:"Es un psiquiatra caníbal.",
    dato:"Hopkins ganó el Oscar apareciendo en pantalla apenas unos 16 minutos." },

  { cat:"hollywood", dif:1,
    q:"En la saga 'Harry Potter', ¿cómo se llama el colegio de magia?",
    ops:["Durmstrang","Hogwarts","Beauxbatons","Ilvermorny"], ok:1,
    pista:"Su director es Albus Dumbledore.",
    dato:"Las otras tres también son escuelas de magia dentro de ese universo." },

  { cat:"hollywood", dif:2,
    q:"¿Qué actor interpretó al Joker en 'Batman: El caballero de la noche' (2008)?",
    ops:["Joaquin Phoenix","Jack Nicholson","Heath Ledger","Jared Leto"], ok:2,
    pista:"Ganó un Oscar póstumo por ese papel.",
    dato:"Joaquin Phoenix también ganó un Oscar por el Joker, en 2019." },

  { cat:"hollywood", dif:2,
    q:"¿Quién dirigió 'Pulp Fiction' (1994)?",
    ops:["Martin Scorsese","Quentin Tarantino","David Fincher","Los hermanos Coen"], ok:1,
    pista:"Le encantan los diálogos largos y la violencia estilizada.",
    dato:"Ganó la Palma de Oro en Cannes y el Oscar al mejor guion." },

  { cat:"hollywood", dif:1,
    q:"En 'Matrix' (1999), ¿de qué color es la píldora que elige Neo para ver la verdad?",
    ops:["Azul","Roja","Verde","Blanca"], ok:1,
    pista:"La otra opción te devuelve a la ignorancia.",
    dato:"La dirigieron las hermanas Wachowski." },

  { cat:"hollywood", dif:2,
    q:"¿Qué película de Marvel (2019) llegó a ser la más taquillera de la historia?",
    ops:["Avengers: Infinity War","Avengers: Endgame","Black Panther","Spider-Man: No Way Home"], ok:1,
    pista:"Es el cierre de la 'Saga del Infinito'.",
    dato:"Destronó a 'Avatar', que luego recuperó el puesto con una reestrena." },

  { cat:"hollywood", dif:3,
    q:"¿Quién compuso la música de 'Star Wars', 'Tiburón' e 'Indiana Jones'?",
    ops:["Hans Zimmer","John Williams","Ennio Morricone","Danny Elfman"], ok:1,
    pista:"Es la persona viva con más nominaciones al Oscar.",
    dato:"Acumula más de 50 nominaciones al Oscar a lo largo de su carrera." },

  { cat:"hollywood", dif:2,
    q:"En 'Volver al futuro', ¿qué auto funciona como máquina del tiempo?",
    ops:["Ford Mustang","DeLorean DMC-12","Chevrolet Camaro","Cadillac Eldorado"], ok:1,
    pista:"Tiene puertas que se abren hacia arriba.",
    dato:"Necesita alcanzar las 88 millas por hora para viajar en el tiempo." },

  { cat:"hollywood", dif:2,
    q:"¿Quién dirigió 'El origen' (Inception, 2010)?",
    ops:["Denis Villeneuve","Christopher Nolan","Ridley Scott","Alfonso Cuarón"], ok:1,
    pista:"También hizo la trilogía de Batman con Christian Bale.",
    dato:"El famoso trompo del final dejó su destino a interpretación del público." },

  /* ===================== CINE ARGENTINO Y LATINO ===================== */
  { cat:"argentino", dif:2,
    q:"¿Qué película argentina ganó el Oscar a Mejor Película Extranjera en 2010?",
    ops:["Relatos salvajes","El secreto de sus ojos","Nueve reinas","El hijo de la novia"], ok:1,
    pista:"La dirigió Juan José Campanella.",
    dato:"Su escena del estadio de fútbol es un plano secuencia digital memorable." },

  { cat:"argentino", dif:2,
    q:"¿Quién dirigió 'Relatos salvajes' (2014)?",
    ops:["Juan José Campanella","Damián Szifron","Pablo Trapero","Lucrecia Martel"], ok:1,
    pista:"Son seis historias independientes sobre la furia.",
    dato:"Estuvo nominada al Oscar a Mejor Película Extranjera." },

  { cat:"argentino", dif:3,
    q:"En 'Nueve reinas' (2000), ¿qué dúo de estafadores la protagoniza?",
    ops:["Ricardo Darín y Gastón Pauls","Francella y Darín","Sbaraglia y Darín","Peretti y Pauls"], ok:0,
    pista:"Uno es un estafador veterano; el otro, casi un novato.",
    dato:"La dirigió Fabián Bielinsky y tuvo una remake de Hollywood ('Criminal')." },

  { cat:"argentino", dif:3,
    q:"¿Qué película argentina ganó el Oscar extranjero en 1986, la primera de Latinoamérica?",
    ops:["La historia oficial","Camila","La tregua","El secreto de sus ojos"], ok:0,
    pista:"Trata sobre la apropiación de bebés durante la dictadura.",
    dato:"La dirigió Luis Puenzo y marcó un hito para el cine latinoamericano." },

  { cat:"argentino", dif:1,
    q:"¿Qué actor protagoniza 'El secreto de sus ojos' y 'Argentina, 1985'?",
    ops:["Guillermo Francella","Ricardo Darín","Leonardo Sbaraglia","Diego Peretti"], ok:1,
    pista:"Es quizá el actor argentino más internacional.",
    dato:"También protagonizó 'Nueve reinas' y 'El hijo de la novia'." },

  { cat:"argentino", dif:2,
    q:"¿Qué actor, más conocido por la comedia, brilla en un rol dramático en 'El secreto de sus ojos'?",
    ops:["Guillermo Francella","Diego Capusotto","Adrián Suar","Pablo Rago"], ok:0,
    pista:"Hizo de Sandoval, el compañero alcohólico del protagonista.",
    dato:"Su papel sorprendió al gran público por el giro dramático." },

  { cat:"argentino", dif:2,
    q:"La película mexicana 'Roma' (2018), que ganó 3 Oscars, fue dirigida por...",
    ops:["Guillermo del Toro","Alejandro G. Iñárritu","Alfonso Cuarón","Carlos Reygadas"], ok:2,
    pista:"También dirigió 'Gravedad' y 'Y tu mamá también'.",
    dato:"Ganó Mejor Director, Mejor Película Extranjera y Mejor Fotografía." },

  { cat:"argentino", dif:2,
    q:"¿Qué director mexicano ganó el Oscar por 'La forma del agua' (2017)?",
    ops:["Alfonso Cuarón","Guillermo del Toro","Alejandro G. Iñárritu","Emmanuel Lubezki"], ok:1,
    pista:"Le encantan los monstruos y los cuentos oscuros.",
    dato:"Ganó Mejor Director y Mejor Película con un romance entre mujer y criatura." },

  { cat:"argentino", dif:3,
    q:"¿Quién dirigió 'Argentina, 1985' (2022), sobre el Juicio a las Juntas?",
    ops:["Santiago Mitre","Damián Szifron","Juan José Campanella","Benjamín Naishtat"], ok:0,
    pista:"Trabajó antes con Darín en 'La cordillera'.",
    dato:"Ganó el Globo de Oro y estuvo nominada al Oscar extranjero." },

  { cat:"argentino", dif:3,
    q:"¿Qué película brasileña sobre las favelas de Río dirigió Fernando Meirelles (2002)?",
    ops:["Tropa de Élite","Ciudad de Dios","Estación Central","El abrazo de la serpiente"], ok:1,
    pista:"Su título original es 'Cidade de Deus'.",
    dato:"Tuvo 4 nominaciones al Oscar, algo rarísimo para una película brasileña." },

  /* ===================== ANIMACIÓN ===================== */
  { cat:"animacion", dif:1,
    q:"¿Cuál fue la primera película de Pixar, estrenada en 1995?",
    ops:["Bichos","Toy Story","Monsters Inc.","Buscando a Nemo"], ok:1,
    pista:"Sus protagonistas son juguetes.",
    dato:"Fue el primer largometraje hecho enteramente por computadora." },

  { cat:"animacion", dif:2,
    q:"¿Qué estudio japonés produjo 'El viaje de Chihiro' y 'Mi vecino Totoro'?",
    ops:["Studio Ghibli","Toei Animation","Madhouse","Pixar"], ok:0,
    pista:"Lo fundó Hayao Miyazaki.",
    dato:"Su logo es justamente el personaje Totoro." },

  { cat:"animacion", dif:2,
    q:"¿Qué película de Pixar (2017) transcurre en el Día de los Muertos en México?",
    ops:["Coco","El libro de la vida","Encanto","Vivo"], ok:0,
    pista:"Su protagonista, Miguel, sueña con ser músico.",
    dato:"Ganó el Oscar a Mejor Película Animada." },

  { cat:"animacion", dif:2,
    q:"¿Quién dirigió 'El viaje de Chihiro' (2001), ganadora del Oscar?",
    ops:["Hayao Miyazaki","Makoto Shinkai","Isao Takahata","Mamoru Hosoda"], ok:0,
    pista:"Es el maestro más célebre del Studio Ghibli.",
    dato:"Fue la primera (y por años la única) anime en ganar el Oscar animado." },

  { cat:"animacion", dif:1,
    q:"En 'El Rey León' (1994), ¿cómo se llama el padre de Simba?",
    ops:["Scar","Mufasa","Rafiki","Zazu"], ok:1,
    pista:"Su hermano lo traiciona.",
    dato:"La famosa escena de la estampida tardó años en poder animarse." },

  { cat:"animacion", dif:1,
    q:"¿Qué película de Disney (2013) popularizó la canción 'Libre soy'?",
    ops:["Enredados","Frozen","Moana","Encanto"], ok:1,
    pista:"Sus protagonistas son las hermanas Elsa y Anna.",
    dato:"Fue, en su momento, la película animada más taquillera de la historia." },

  { cat:"animacion", dif:1,
    q:"¿Qué película de Pixar ocurre dentro de la cabeza de una niña, entre sus emociones?",
    ops:["Intensa-Mente","Soul","Up","Coco"], ok:0,
    pista:"Alegría, Tristeza y Furia son personajes.",
    dato:"Su título original es 'Inside Out'." },

  { cat:"animacion", dif:2,
    q:"¿De qué estudio es 'Shrek' (2001)?",
    ops:["Pixar","DreamWorks","Disney","Illumination"], ok:1,
    pista:"El mismo estudio de 'Madagascar' y 'Kung Fu Panda'.",
    dato:"Ganó el primer Oscar a Mejor Película Animada de la historia." },

  { cat:"animacion", dif:2,
    q:"En 'Buscando a Nemo', ¿qué tipo de pez es Nemo?",
    ops:["Pez ángel","Pez payaso","Pez cirujano","Pez globo"], ok:1,
    pista:"Es naranja con rayas blancas.",
    dato:"Dory, en cambio, es un pez cirujano azul." },

  { cat:"animacion", dif:2,
    q:"¿Qué película de Pixar abre con la vida muda de una pareja, Carl y Ellie?",
    ops:["Wall-E","Up","Coco","Soul"], ok:1,
    pista:"Después, una casa vuela con miles de globos.",
    dato:"Esos primeros minutos son citados como de los más emotivos del cine animado." },

  { cat:"animacion", dif:2,
    q:"¿Quién pone la voz original (en inglés) de Woody en 'Toy Story'?",
    ops:["Tim Allen","Tom Hanks","Billy Crystal","Robin Williams"], ok:1,
    pista:"También protagonizó 'Forrest Gump'.",
    dato:"Tim Allen, en cambio, es la voz de Buzz Lightyear." },

  { cat:"animacion", dif:1,
    q:"¿Qué película de Disney (2021) está ambientada en Colombia con canciones de Lin-Manuel Miranda?",
    ops:["Coco","Encanto","Vivo","Moana"], ok:1,
    pista:"La familia Madrigal vive en una casa mágica.",
    dato:"La canción 'No se habla de Bruno' fue número uno en muchos países." },

  { cat:"animacion", dif:1,
    q:"¿Cuál es el robot protagonista de la película de Pixar (2008) sobre una Tierra abandonada?",
    ops:["WALL-E","Baymax","Bender","R2-D2"], ok:0,
    pista:"Su trabajo es compactar basura.",
    dato:"Casi no tiene diálogos durante la primera mitad de la película." },

  /* ===================== MIX DE CINE ===================== */
  { cat:"mixto", dif:2,
    q:"¿Qué película ganó el Oscar a Mejor Película en 2020, la primera de habla no inglesa?",
    ops:["1917","Parasite","Joker","Once Upon a Time in Hollywood"], ok:1,
    pista:"Es surcoreana y la dirigió Bong Joon-ho.",
    dato:"También ganó Mejor Director, Guion y Película Internacional la misma noche." },

  { cat:"mixto", dif:2,
    q:"¿De qué película es la frase 'Le haré una oferta que no podrá rechazar'?",
    ops:["Buenos muchachos","El Padrino","Scarface","Casino"], ok:1,
    pista:"La dice Vito Corleone.",
    dato:"Es una de las frases más citadas en la historia del cine." },

  { cat:"mixto", dif:1,
    q:"¿Qué director hizo 'Tiburón', 'E.T.' y 'Jurassic Park'?",
    ops:["George Lucas","Steven Spielberg","Robert Zemeckis","Ridley Scott"], ok:1,
    pista:"Cofundó el estudio DreamWorks.",
    dato:"'Tiburón' es considerada la primera película 'blockbuster' de verano." },

  { cat:"mixto", dif:1,
    q:"La película 'Joker' (2019) está protagonizada por...",
    ops:["Joaquin Phoenix","Heath Ledger","Jared Leto","Jack Nicholson"], ok:0,
    pista:"Bajó muchos kilos para el papel.",
    dato:"Ganó el Oscar a Mejor Actor por esta interpretación." },

  { cat:"mixto", dif:2,
    q:"¿Qué actor protagoniza 'Náufrago', hablando con una pelota llamada Wilson?",
    ops:["Tom Hanks","Brad Pitt","Matt Damon","Tom Cruise"], ok:0,
    pista:"Es el mismo de 'Forrest Gump' y 'Toy Story'.",
    dato:"Wilson, la pelota, se volvió un personaje querido pese a no hablar." },

  { cat:"mixto", dif:3,
    q:"¿Con qué película Leonardo DiCaprio ganó finalmente su primer Oscar (2016)?",
    ops:["El lobo de Wall Street","El renacido","Django sin cadenas","El origen"], ok:1,
    pista:"Sufrió frío extremo filmando en la nieve.",
    dato:"La dirigió Alejandro González Iñárritu, que ganó Mejor Director." },

  { cat:"mixto", dif:1,
    q:"¿Qué saga protagoniza el personaje 'Dominic Toretto'?",
    ops:["Misión Imposible","Rápidos y Furiosos","John Wick","Transformers"], ok:1,
    pista:"Todo es sobre autos, velocidad y 'la familia'.",
    dato:"Lo interpreta Vin Diesel desde la primera película de 2001." },

  { cat:"mixto", dif:3,
    q:"¿Qué película de terror de 1980 dirigió Stanley Kubrick, basada en Stephen King?",
    ops:["It","El resplandor","La cosa","Pesadilla en lo profundo"], ok:1,
    pista:"'¿Estás aquí, Danny?' y un hotel embrujado.",
    dato:"El propio Stephen King no quedó conforme con esta adaptación." },

  { cat:"mixto", dif:3,
    q:"¿Qué película de 1994 transcurre en la prisión de Shawshank?",
    ops:["Pena de muerte","Cadena perpetua (Sueños de libertad)","La milla verde","Escape de Alcatraz"], ok:1,
    pista:"Basada en un relato de Stephen King, sobre la esperanza.",
    dato:"Fracasó en cines pero hoy figura entre las mejores películas de la historia." },

  /* ===================== TERROR Y SLASHER ===================== */
  { cat:"terror", dif:2,
    q:"¿Cómo se llama el asesino enmascarado de la saga 'Halloween'?",
    ops:["Jason Voorhees","Michael Myers","Freddy Krueger","Ghostface"], ok:1,
    pista:"Aterroriza el pueblo de Haddonfield cada 31 de octubre.",
    dato:"Su máscara es, en realidad, una careta del capitán Kirk pintada de blanco." },

  { cat:"terror", dif:1,
    q:"¿Qué asesino usa un guante con cuchillas y ataca dentro de los sueños?",
    ops:["Jason Voorhees","Freddy Krueger","Leatherface","Michael Myers"], ok:1,
    pista:"Su lema: 'si te dormís, morís'.",
    dato:"Lo creó Wes Craven en 1984; un Johnny Depp jovencísimo debutó en esa película." },

  { cat:"terror", dif:2,
    q:"En la saga 'Viernes 13', ¿quién es el asesino de la máscara de hockey?",
    ops:["Jason Voorhees","Norman Bates","Michael Myers","Ghostface"], ok:0,
    pista:"Acecha en el campamento Crystal Lake.",
    dato:"Dato fino: en la primera película (1980) el asesino NO es él, sino su madre." },

  { cat:"terror", dif:2,
    q:"¿Qué slasher de 1996 de Wes Craven revivió el género con el asesino 'Ghostface'?",
    ops:["Scream (Grita antes de morir)","Sé lo que hicieron el verano pasado","Leyenda urbana","Halloween H20"], ok:0,
    pista:"Sus personajes conocen y comentan 'las reglas' del cine de terror.",
    dato:"La máscara de Ghostface se inspira en el cuadro 'El grito' de Munch." },

  { cat:"terror", dif:3,
    q:"¿Qué clásico de 1974 presentó por primera vez a 'Leatherface' y su motosierra?",
    ops:["La masacre de Texas","Las colinas tienen ojos","El pueblo de los malditos","La matanza caníbal"], ok:0,
    pista:"Su título original es 'The Texas Chain Saw Massacre'.",
    dato:"Dirigida por Tobe Hooper, casi no muestra sangre pese a su fama brutal." },

  { cat:"terror", dif:2,
    q:"En 'Psicosis' (1960) de Hitchcock, ¿cómo se llama el dueño del motel?",
    ops:["Norman Bates","Jack Torrance","Patrick Bateman","Hannibal Lecter"], ok:0,
    pista:"Tiene una relación muy extraña con su madre.",
    dato:"La escena de la ducha se montó con unos 78 planos en apenas 45 segundos." },

  { cat:"terror", dif:2,
    q:"¿Qué película de 1973 sobre una niña poseída conmocionó al mundo?",
    ops:["La profecía","El exorcista","El bebé de Rosemary","Poltergeist"], ok:1,
    pista:"Aparecen dos sacerdotes intentando un ritual.",
    dato:"Fue la primera película de terror nominada al Oscar a Mejor Película." },

  { cat:"terror", dif:2,
    q:"¿Quién dirigió 'Huye!' (Get Out, 2017) y '¡Nop!' (Nope)?",
    ops:["Ari Aster","Jordan Peele","Robert Eggers","James Wan"], ok:1,
    pista:"Antes era conocido por la comedia.",
    dato:"Ganó el Oscar al Mejor Guion Original por 'Get Out'." },

  { cat:"terror", dif:3,
    q:"¿Qué director levantó las sagas 'El conjuro', 'Insidious' y la primera 'Saw'?",
    ops:["Eli Roth","James Wan","Rob Zombie","Sam Raimi"], ok:1,
    pista:"Es australiano y también dirigió 'Aquaman'.",
    dato:"Convirtió el terror moderno en un negocio de universos conectados." },

  { cat:"terror", dif:2,
    q:"¿Qué película de 1999 popularizó el 'found footage' con tres jóvenes perdidos en un bosque?",
    ops:["Actividad Paranormal","El proyecto Blair Witch","REC","Cloverfield"], ok:1,
    pista:"'Found footage' = simula ser material real encontrado.",
    dato:"Su marketing hizo creer a mucha gente que las desapariciones eran reales." },

  { cat:"terror", dif:2,
    q:"¿Qué saga gira en torno al asesino 'Jigsaw' y sus trampas mortales?",
    ops:["Hostal","Saw (El juego del miedo)","Cube","Destino final"], ok:1,
    pista:"'¿Querés jugar un juego?'",
    dato:"La primera se rodó en menos de tres semanas y con muy poco presupuesto." },

  { cat:"terror", dif:3,
    q:"¿Qué película de 'terror elevado' (2018) dirigió Ari Aster sobre una familia en duelo?",
    ops:["El legado del diablo (Hereditary)","Babadook","La bruja","It Follows"], ok:0,
    pista:"Una maqueta, una decapitación y un final infernal.",
    dato:"Aster volvería al año siguiente con 'Midsommar'." },

  { cat:"terror", dif:1,
    q:"¿Qué muñeco diabólico protagoniza la saga 'Chucky' (Child's Play)?",
    ops:["Annabelle","Chucky","Billy","Slappy"], ok:1,
    pista:"Es un muñeco pelirrojo poseído por un asesino.",
    dato:"Annabelle, en cambio, pertenece al universo de 'El conjuro'." },

  { cat:"terror", dif:1,
    q:"¿En qué película aparece el payaso 'Pennywise', de una novela de Stephen King?",
    ops:["It (Eso)","Payasos asesinos","Terrifier","La niebla"], ok:0,
    pista:"Sale de las alcantarillas cada 27 años.",
    dato:"Tim Curry lo hizo famoso en 1990; Bill Skarsgård, en las versiones de 2017/2019." },

  { cat:"terror", dif:3,
    q:"¿Cómo se llama el arquetipo de la última sobreviviente típica del slasher?",
    ops:["'Scream Queen'","'Final Girl'","'Last Stand'","'Survivor'"], ok:1,
    pista:"Es la que enfrenta al asesino al final, casi siempre sola.",
    dato:"Laurie Strode ('Halloween') y Sidney Prescott ('Scream') son ejemplos icónicos." }
];
