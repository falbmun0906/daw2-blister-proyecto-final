export interface SchemaIndexDefinition {
  key: Record<string, 1 | -1>;
  options: {
    unique?: boolean;
    sparse?: boolean;
    expireAfterSeconds?: number;
  };
}

export const findSchemaIndex = (
  indexes: [Record<string, 1 | -1>, SchemaIndexDefinition['options']][],
  key: Record<string, 1 | -1>,
): SchemaIndexDefinition | undefined => {
  const index = indexes.find(([candidate]) => JSON.stringify(candidate) === JSON.stringify(key));

  if (!index) {
    return undefined;
  }

  return {
    key: index[0],
    options: index[1],
  };
};
