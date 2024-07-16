const DiceRoller = artifacts.require("DiceRoller");

module.exports = function(deployer) {
  deployer.deploy(
    DiceRoller,
    process.env.VRF_COORDINATOR,
    process.env.LINK_TOKEN,
    process.env.KEY_HASH,
    process.env.FEE
  );
};