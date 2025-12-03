/**
 * Convert a name from UPPERCASE to Title Case
 * "MICHAEL JORDAN" -> "Michael Jordan"
 */
function toTitleCase(str) {
  if (!str) return str;
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Filter and sort persons based on criteria, return array of names
 */
function getFilteredNames({
  persons,
  similarityThreshold,
  maxNumberOfFaces = 12,
  faceSizeThreshold,
  borderMargin = 0,
  photoRatio = 1,
  filterGroup = null,
  allUsers = [],
  useTitleCase = false,
}) {
  if (!persons || persons.length === 0) return [];

  const isLandscape = photoRatio > 1;
  const marginFractionX = isLandscape
    ? borderMargin / 100 / photoRatio
    : borderMargin / 100;
  const marginFractionY = isLandscape
    ? borderMargin / 100
    : (borderMargin / 100) * photoRatio;

  return persons
    .sort(compareByHeight)
    .slice(0, maxNumberOfFaces)
    .sort(compareByLeftPosition)
    .filter((person) => {
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

      let isInFilterGroup = true;
      if (filterGroup && person?.name) {
        const matchedUser =
          allUsers?.find((u) => u.name === person.name) || person.match;
        const userGroups = matchedUser?.groups || [];

        if (filterGroup === "__no_group__") {
          isInFilterGroup = userGroups.length === 0;
        } else {
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
          persons.reduce((max, p) => (p.height > max.height ? p : max)).height /
            (100 / faceSizeThreshold) &&
        isWithinBorder &&
        isInFilterGroup
      );
    })
    .map((person) => (useTitleCase ? toTitleCase(person.name) : person.name));
}

/**
 * Get just the list of person names (for IPTC PersonInImage field)
 */
export function getPersonsList(options) {
  return getFilteredNames(options);
}

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
  useTitleCase = false,
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
      useTitleCase,
    });
  }

  const captionStart = useTitleCase ? "Da sx " : start;
  const captionLast = useTitleCase ? " e " : last;

  const arrayOfNames = getFilteredNames({
    persons,
    similarityThreshold,
    maxNumberOfFaces,
    faceSizeThreshold,
    borderMargin,
    photoRatio,
    filterGroup,
    allUsers,
    useTitleCase,
  });

  if (arrayOfNames.length === 0) {
    return "";
  }

  if (arrayOfNames.length > 1) {
    return (
      captionStart +
      arrayOfNames.slice(0, -1).join(" ") +
      captionLast +
      arrayOfNames.slice(-1)
    );
  } else {
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
  useTitleCase = false,
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

  const caption =
    createCaption({
      persons: upperRow,
      start: useTitleCase ? "In piedi da sx " : "IN PIEDI DA SX ",
      last: " ",
      similarityThreshold,
      isFootballTeam: false,
      faceSizeThreshold,
      borderMargin,
      photoRatio,
      filterGroup,
      allUsers,
      useTitleCase,
    }) +
    " " +
    createCaption({
      persons: bottomRow,
      start: useTitleCase ? "Accosciati da sx " : "ACCOSCIATI DA SX ",
      last: " ",
      similarityThreshold,
      isFootballTeam: false,
      faceSizeThreshold,
      borderMargin,
      photoRatio,
      filterGroup,
      allUsers,
      useTitleCase,
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
