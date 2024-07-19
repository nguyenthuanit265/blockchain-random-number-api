const DiceRoller = artifacts.require("DiceRollerChainlink");

module.exports = function(deployer) {
  deployer.deploy(
    DiceRollerChainlink,
    process.env.VRF_COORDINATOR,
    process.env.LINK_TOKEN,
    process.env.KEY_HASH,
    process.env.FEE
  );
};