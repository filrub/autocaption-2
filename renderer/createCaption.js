export function createCaption({
  persons,
  start = "DA SX ",
  last = " E ",
  similarityThreshold,
  isFootballTeam = false,
  maxNumberOfFaces = 12,
  faceSizeThreshold,
  borderMargin = 0,
  photoRatio = 1,
  filterGroup = null,
  allUsers = [],
}) {
  if (isFootballTeam) {
    return createFootbalTeamCaption({
      persons,
      similarityThreshold,
      maxNumberOfFaces,
      faceSizeThreshold,
      borderMargin,
      photoRatio,
      filterGroup,
      allUsers,
    });
  }

  // Calculate margin fractions based on smaller dimension for equal pixel distance
  // For landscape (ratio > 1): height is smaller, so marginY > marginX
  // For portrait (ratio < 1): width is smaller, so marginX > marginY
  const isLandscape = photoRatio > 1;
  const marginFractionX = isLandscape
    ? borderMargin / 100 / photoRatio // height-based margin converted to width fraction
    : borderMargin / 100;
  const marginFractionY = isLandscape
    ? borderMargin / 100
    : (borderMargin / 100) * photoRatio; // width-based margin converted to height fraction

  const arrayOfNames = persons
    //ordino dalla faccia più grande alla più piccola
    .sort(compareByHeight)
    //tengo solo le prime maxNumberOfFaces facce
    .slice(0, maxNumberOfFaces)
    //ordino le facce da sx verso dx
    .sort(compareByLeftPosition)
    //elimino le persone che non rispettano i criteri
    .filter((person) => {
      // Check if entire face box is within the border margin (not touching edges)
      const faceLeft = person.x;
      const faceRight = person.x + person.width;
      const faceTop = person.y;
      const faceBottom = person.y + person.height;
      const isWithinBorder =
        borderMargin === 0 ||
        (faceLeft >= marginFractionX &&
          faceRight <= 1 - marginFractionX &&
          faceTop >= marginFractionY &&
          faceBottom <= 1 - marginFractionY);

      // Check if person is in the filter group (if filter is active)
      let isInFilterGroup = true;
      if (filterGroup && person?.name) {
        // Always look up fresh user data for groups (allUsers has latest from DB)
        const matchedUser =
          allUsers?.find((u) => u.name === person.name) || person.match;
        const userGroups = matchedUser?.groups || [];

        if (filterGroup === "__no_group__") {
          // For "no group" filter, include only users with no groups
          isInFilterGroup = userGroups.length === 0;
        } else {
          // For regular group filter, include only users in that group (case-insensitive)
          const filterUpper = filterGroup.toUpperCase();
          isInFilterGroup = userGroups.some(
            (g) => g.toUpperCase() === filterUpper
          );
        }
      }

      return (
        person?.name !== "" &&
        person?.name !== undefined &&
        person.distance >= similarityThreshold &&
        person.height >
          persons.reduce((max, person) =>
            person.height > max.height ? person : max
          ).height /
            (100 / faceSizeThreshold) &&
        isWithinBorder &&
        isInFilterGroup
      );
    })
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
  borderMargin = 0,
  photoRatio = 1,
  filterGroup = null,
  allUsers = [],
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
      borderMargin,
      photoRatio,
      filterGroup,
      allUsers,
    }) +
    " " +
    createCaption({
      persons: bottomRow,
      start: "ACCOSCIATI DA SX ",
      last: " ",
      similarityThreshold,
      isFootballTeam: false,
      faceSizeThreshold,
      borderMargin,
      photoRatio,
      filterGroup,
      allUsers,
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
