/* CONTRACT ADDRESSES ON MAINNET */
const CURVE_DAO_ADDRESS = "0xD533a949740bb3306d119CC777fa900bA034cd52";
const CRV3_ADDRESS = "0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490";
const CRV3_POOL_ADDRESS = "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7";
const GAUGE_CONTROLLER_ADDRESS = "0x2F50D538606Fa9EDD2B11E2446BEb18C9D5846bB";
const GAUGE_MINTER = "0xd061D61a4d941c39E5453435B6345Dc261C2fcE0";
const ETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const CURVE_FACTORY_ADDRESS = "0xB9fC157394Af804a3578134A6585C0dc9cc990d4";

module.exports = {
    noExp: function (str) {
        if (typeof str !== "string") str = String(str);
        if (str.indexOf("e+") === -1) {
            if (str.indexOf(".") != -1) str = String(Math.floor(Number(str)));
            return str;
        }
        // if number is in scientific notation, pick (b)ase and (p)ower
        str = str
            .replace(".", "")
            .split("e+")
            .reduce(function (b, p) {
                return b + Array(p - b.length + 2).join(0);
            });
        return str;
    },
    printBalance: async function (ownerName, ownerAddress, cntName, cnt) {
        console.log(
            `BALANCE: ${ownerName}, cntName: ${cntName}, Balance: ${await cnt.balanceOf(
                ownerAddress
            )} `
        );
    },
    CURVE_DAO_ADDRESS,
    CRV3_ADDRESS,
    CRV3_POOL_ADDRESS,
    GAUGE_CONTROLLER_ADDRESS,
    GAUGE_MINTER,
    ETH_ADDRESS,
    CURVE_FACTORY_ADDRESS,
};
