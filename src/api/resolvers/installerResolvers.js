module.exports = {
  Installer: {
    assignments: async ({ assignments }, _, { tools }) => (await Promise.all(
      assignments.map(a => tools.read.standard('job', a)),
    )).sort((a, b) => b.modifiedTime - a.modifiedTime),
  },
};
