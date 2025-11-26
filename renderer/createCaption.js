export function createCaption({
  persons,
  start = "DA SX ",
  last = " E ",
  similarityThreshold,
  isFootballTeam = false,
  maxNumberOfFaces = 12,
  faceSizeThreshold,
}) {
  if (isFootballTeam) {
    return createFootbalTeamCaption({
      persons,
      similarityThreshold,
      maxNumberOfFaces,
      faceSizeThreshold,
    });
  }

  const arrayOfNames = persons
    //ordino dalla faccia più grande alla più piccola
    .sort(compareByHeight)
    //tengo solo le prime maxNumberOfFaces facce
    .slice(0, maxNumberOfFaces)
    //ordino le facce da sx verso dx
    .sort(compareByLeftPosition)
    //elimino le persone che non rispettano i criteri
    .filter(
      (person) =>
        person?.name !== "" &&
        person?.name !== undefined &&
        person.distance >= similarityThreshold &&
        person.height >
          persons.reduce((max, person) =>
            person.height > max.height ? person : max
          ).height /
            (100 / faceSizeThreshold)
    )
    //creo un array dei nomi per la caption
    .map((person) => person.name);

  //se l'array dei nomi è vuoto ritorno una stringa vuota
  if (arrayOfNames.length == 0) {
    return "";
  }

  //se i nomi sono più di uno aggiungo "da sx" all'inizio e "E" prima dell'ultimo nome
  if (arrayOfNames.length > 1) {
    return (
      start +
      arrayOfNames.slice(0, -1).join(" ") +
      last +
      arrayOfNames.slice(-1)
    );
  } else {
    //se il nome è solo uno lo ritorno e basta
    return arrayOfNames[0];
  }
}

function createFootbalTeamCaption({
  persons,
  similarityThreshold,
  faceSizeThreshold = 50,
}) {
  const minY = persons.reduce((max, person) =>
    person.height < max.height ? person : max
  ).y;
  const maxY = persons.reduce((max, person) =>
    person.height > max.height ? person : max
  ).y;
  const middleY = (maxY - minY) / 2 + minY;
  const upperRow = persons.filter((person) => person.y < middleY);
  const bottomRow = persons.filter((person) => person.y > middleY);

  console.log(
    "minY",
    minY,
    "maxY",
    maxY,
    "middleY",
    middleY,
    "upperRow",
    upperRow,
    "bottomRow",
    bottomRow
  );

  const caption =
    createCaption({
      persons: upperRow,
      start: "IN PIEDI DA SX ",
      last: " ",
      similarityThreshold,
      isFootballTeam: false,
      faceSizeThreshold,
    }) +
    " " +
    createCaption({
      persons: bottomRow,
      start: "ACCOSCIATI DA SX ",
      last: " ",
      similarityThreshold,
      isFootballTeam: false,
      faceSizeThreshold,
    });
  return caption;
}

function compareByLeftPosition(a, b) {
  if (a.x < b.x) {
    return -1;
  }
  if (a.x > b.x) {
    return 1;
  }
  return 0;
}

function compareByHeight(a, b) {
  if (a.height > b.height) {
    return -1;
  }
  if (a.height < b.height) {
    return 1;
  }
  return 0;
}
