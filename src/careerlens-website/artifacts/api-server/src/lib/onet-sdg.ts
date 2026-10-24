/**
 * Reviewed CareerLens interpretations of occupation activities and UN targets.
 * NOT an O*NET field, an official UN occupation classification, or measured impact.
 * Keys are exact O*NET-SOC codes: titles and local database IDs may change.
 */
type Association = { number: number; name: string; explanation: string };

const goals: Record<number, string> = {
  3: "Good Health and Well-Being", 4: "Quality Education",
  6: "Clean Water and Sanitation", 7: "Affordable and Clean Energy",
  8: "Decent Work and Economic Growth", 9: "Industry, Innovation and Infrastructure",
  11: "Sustainable Cities and Communities", 12: "Responsible Consumption and Production",
  13: "Climate Action",
};
const link = (number: number, explanation: string): Association => ({
  number, name: goals[number], explanation,
});
const mappings = new Map<string, Association[]>();
const assign = (codes: string[], associations: Association[]) => {
  for (const code of codes) mappings.set(code, associations);
};

assign([
  "15-1251.00", "15-1252.00", "15-1253.00", "15-1254.00", "15-1255.00",
  "15-1211.00", "15-1212.00", "15-1241.00", "15-1242.00", "15-1243.00",
  "15-1244.00", "15-1231.00", "15-1221.00", "15-2031.00", "15-2041.00", "15-2051.00",
], [
  link(8, "CareerLens association with target 8.2: software, systems, and analytical work can support productive technological innovation. Contribution depends on the work performed."),
  link(9, "CareerLens association with targets 9.1 and 9.5: developing, testing, securing, or analyzing digital systems can support reliable infrastructure and innovation."),
]);
assign(["15-1232.00"], [
  link(4, "CareerLens association with target 4.4: technical user support can help people develop practical ICT skills when guidance and training are part of the role."),
  link(8, "CareerLens association with target 8.2: helping users resolve computing problems can support effective and productive work."),
]);
assign(["29-1141.00", "29-2061.00", "29-1071.00", "29-1171.00", "31-1131.00"], [
  link(3, "CareerLens association with target 3.8: clinical assessment, nursing, and patient support can contribute to access to quality health services."),
]);
assign(["29-1141.01"], [
  link(3, "CareerLens association with target 3.8: acute-care nursing can support access to health services and patient care. This is an occupational association, not measured impact or proof of specialty qualification."),
]);
assign(["43-4171.00"], [
  link(8, "CareerLens association with target 8.2: reception and information coordination can support productive service and workplace operations. This is a directional association, not measured impact."),
]);
assign(["51-1011.00"], [
  link(8, "CareerLens association with target 8.8: production supervision may support safe working conditions and worker protection; practices depend on the workplace."),
  link(12, "CareerLens association with target 12.5: production planning can support waste prevention when resource-efficient processes are part of the role."),
]);
assign(["25-2011.00", "25-2012.00", "25-2021.00", "25-2022.00", "25-2031.00", "25-9031.00"], [
  link(4, "CareerLens association with targets 4.1 and 4.2: teaching and coordinating learning can support inclusive, quality education."),
]);
assign(["17-2141.00", "17-2112.00", "17-2131.00"], [
  link(9, "CareerLens association with target 9.4: engineering and production improvement can support more capable industrial systems."),
  link(12, "CareerLens association with target 12.2: design and process choices can improve material and resource efficiency."),
]);
assign(["17-2051.00"], [
  link(9, "CareerLens association with target 9.1: civil engineering can contribute to reliable and resilient infrastructure."),
  link(11, "CareerLens association with target 11.3: planning and delivering infrastructure can support sustainable communities."),
]);
assign(["17-2081.00", "19-2041.00"], [
  link(6, "CareerLens association with target 6.3: environmental monitoring and pollution-control work can support water quality when included in the role."),
  link(12, "CareerLens association with targets 12.2 and 12.4: environmental assessment can inform responsible resource use and waste management."),
]);
assign(["17-2199.10", "17-2199.11"], [
  link(7, "CareerLens association with target 7.2: wind and solar engineering can support renewable energy systems."),
  link(13, "CareerLens association with target 13.2: renewable-energy projects can contribute to climate mitigation when implemented responsibly."),
]);
assign(["19-2041.01"], [
  link(13, "CareerLens association with target 13.2: climate analysis can inform mitigation and adaptation planning."),
]);

export const sdgsForOnetCode = (code: string | null | undefined): Association[] =>
  (mappings.get(code?.trim() ?? "") ?? []).map((association) => ({ ...association }));
