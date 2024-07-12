const VRFConsumer = artifacts.require("VRFConsumer");

module.exports = function(deployer) {
  deployer.deploy(
    VRFConsumer,
    process.env.VRF_COORDINATOR,
    process.env.LINK_TOKEN,
    process.env.KEY_HASH,
    process.env.FEE
  );
};
