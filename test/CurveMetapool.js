const { expect, assert } = require("chai");
const poolHelper = require("./PoolHelper.js");

describe("Test Pools Rewards", () => {
    let tUSD_metapool_coin;
    let metaPool;
    let stakingRewards;
    let adminWallet, walletA;
    let ERC20, POOL3, METAPOOL, CRV3, CurveDAO, StakingRewards, TokenMinter;
    let tUSD, tGOV, crv3, weth, curveFactory;
    let mm10 = ethers.utils.parseUnits("10000000", 18);
    let mm3 = ethers.utils.parseUnits("3000000", 18);
    beforeEach("Deploy contracts", async () => {
        [adminWallet, walletA] = await ethers.getSigners();
        ERC20 = await ethers.getContractFactory("MintableToken");
        POOL3 = await ethers.getContractFactory("USDT_USDC_DAI_Pool");
        METAPOOL = await ethers.getContractFactory("metaPool");
        CRV3 = await ethers.getContractFactory("CRV3");
        CurveDAO = await ethers.getContractFactory("CurveDAO");
        StakingRewards = await ethers.getContractFactory("StakingRewards");
        TokenMinter = await ethers.getContractFactory("TokenMinter");
        WETH9 = await ethers.getContractFactory("WETH9");
        Curve2AssetPool = await ethers.getContractFactory("curve2AssetPool");
        CurveFactory = await ethers.getContractFactory("CurveFactory");
        StableSwap = await ethers.getContractFactory("PlainPool2");

        tUSD = await ERC20.deploy("tUSD", "tUSD");
        tGOV = await ERC20.deploy("tGOV", "tGOV");
        weth = await WETH9.deploy();

        // @param: _name: String[64], _symbol: String[32], _decimals: uint256, _supply: uint256
        tUSD_metapool_coin = await CRV3.deploy("tUSDPool", "tUSDPool", "18", 0);
        // .attach: Return an instance of a Contract attached to address.
        crv3 = await CRV3.attach(poolHelper.CRV3_ADDRESS);
        pool3 = await POOL3.attach(poolHelper.CRV3_POOL_ADDRESS);
        curveDAO = await CurveDAO.attach(poolHelper.CURVE_DAO_ADDRESS);
        tokenMinter = await TokenMinter.attach(poolHelper.GAUGE_MINTER);
        curveFactory = await CurveFactory.attach(
            poolHelper.CURVE_FACTORY_ADDRESS
        );

        let result = await ethers.provider.send("hardhat_setBalance", [
            poolHelper.CRV3_POOL_ADDRESS,
            "0x" + Number(10 ** 48).toString(16),
        ]);

        result = await ethers.provider.send("hardhat_setBalance", [
            adminWallet.address,
            "0x" + Number(10 ** 48).toString(16),
        ]);

        // is this 10^48 minus 10^18 ?
        // send ETH and get back WETH
        await weth.deposit({ value: poolHelper.noExp(10 ** 30) });

        await tUSD.mint(adminWallet.address, mm10);
        await tGOV.mint(adminWallet.address, mm10);
    });

    describe("CurveFi Test", () => {
        it("CurveFi Test metaPool", async () => {
            // Impersonate 3CRV
            const accountToImpersonate = poolHelper.CRV3_POOL_ADDRESS;
            await network.provider.request({
                method: "hardhat_impersonateAccount",
                params: [accountToImpersonate],
            });
            const signer = await ethers.getSigner(accountToImpersonate);

            const dectUSD = 2;
            console.log(`Number of decimals in tUSD pool ${dectUSD}`);

            // mint 3 million crv3
            await crv3.connect(signer).mint(adminWallet.address, mm3);

            // We are now adminWallet again
            let balanceSend = poolHelper.noExp(10 ** dectUSD * 100);
            // transfer 10,000 tUSD from adminWallet to walletA
            await tUSD.transfer(walletA.address, balanceSend);

            console.log(`transfer tUSD to UserA balance ${balanceSend}`);
            await poolHelper.printBalance(
                "UserA",
                walletA.address,
                "tUSD",
                tUSD
            );

            /*
            _owner: address, 
            _coins: address[N_COINS], 
            _pool_token: address, 
            _base_pool: address, 
            _A: uint256, 
            _fee: uint256,
            _admin_fee: uint256
            */
            metaPool = await METAPOOL.deploy(
                adminWallet.address,
                [tUSD.address, crv3.address],
                tUSD_metapool_coin.address,
                poolHelper.CRV3_POOL_ADDRESS,
                2000,
                poolHelper.noExp(1e1),
                poolHelper.noExp(1e1)
            );
            /* PERMISSIONS */
            // CRV3.vy method set_minter(). give Curve permission to mint our LP token
            await tUSD_metapool_coin.set_minter(metaPool.address);
            // set unlimited approvals for metapool to use adminWallet tUSD * 3CRV
            await tUSD.approve(metaPool.address, ethers.constants.MaxUint256);
            await crv3.approve(metaPool.address, ethers.constants.MaxUint256);

            let balanceBeforeCRV = await crv3.balanceOf(adminWallet.address);
            let balanceBeforetUSD = await tUSD.balanceOf(adminWallet.address);
            // 2 * 10^8  = 200,000,000
            let amt0 = ethers.utils.parseUnits("2", 8);
            // 2 * 10^18 = 2,000,000,000,000,000,000
            let amt1 = ethers.utils.parseUnits("2", 15);
            // ~10^15 seems upper accepted limit range
            let amt2 = ethers.utils.parseUnits("2", 18);

            console.log("\n--------------------");
            console.log("before liquidity add");
            await poolHelper.printBalance(
                "metaPool",
                metaPool.address,
                "tUSD",
                tUSD
            );
            await poolHelper.printBalance(
                "metaPool",
                metaPool.address,
                "crv3",
                crv3
            );

            // [tUSD.address, crv3.address]
            await metaPool.add_liquidity(
                [poolHelper.noExp(amt0), poolHelper.noExp(amt2)],
                2
            );

            console.log("after liquidity add");
            await poolHelper.printBalance(
                "metaPool",
                metaPool.address,
                "tUSD",
                tUSD
            );
            await poolHelper.printBalance(
                "metaPool",
                metaPool.address,
                "crv3",
                crv3
            );

            expect(await tUSD.balanceOf(metaPool.address)).to.eq(amt0);
            expect(Number(await crv3.balanceOf(metaPool.address))).to.eq(
                Number(amt2)
            );
            console.log("end liquidity add");
            console.log("--------------------\n");

            console.log("--------------------");
            console.log("Before Swap ");
            await poolHelper.printBalance(
                "UserA",
                walletA.address,
                "tUSD",
                tUSD
            );
            await poolHelper.printBalance(
                "UserA",
                walletA.address,
                "crv3",
                crv3
            );

            await tUSD
                .connect(walletA)
                .approve(metaPool.address, poolHelper.noExp(10 ** 50));
            await metaPool
                .connect(walletA)
                .exchange(0, 1, poolHelper.noExp(balanceSend), 0);

            console.log("After Swap ");
            await poolHelper.printBalance(
                "UserA",
                walletA.address,
                "tUSD",
                tUSD
            );
            await poolHelper.printBalance(
                "UserA",
                walletA.address,
                "crv3",
                crv3
            );
            expect(await tUSD.balanceOf(walletA.address)).to.eq(0);

            console.log("End Swap ");
            console.log("--------------------\n");

            const twoWeeks = 1209600;

            console.log(
                `metaPoolToken balance adminWallet: ${await tUSD_metapool_coin.balanceOf(
                    adminWallet.address
                )}`
            );
            /*
                (
        address _owner,
        address _rewardsDistribution,
        address _rewardsToken,
        address _stakingToken,
        uint256 _rewardsDuration
    )
    */
            stakingRewards = await StakingRewards.deploy(
                adminWallet.address,
                adminWallet.address,
                tGOV.address,
                tUSD_metapool_coin.address,
                twoWeeks
            );
            await tGOV.approve(
                stakingRewards.address,
                poolHelper.noExp(10 ** 50)
            );

            // notifyRewardsAmount deposits rewards into the rewards contract
            // with 1 million tGOV
            const rewardAmt = 10 ** 18 * 10 ** 6;
            let resultStaking = await stakingRewards.notifyRewardAmount(
                poolHelper.noExp(rewardAmt),
                adminWallet.address
            );
            await tUSD_metapool_coin.approve(
                stakingRewards.address,
                poolHelper.noExp(10 ** 40)
            );
            await stakingRewards.stake(
                await tUSD_metapool_coin.balanceOf(adminWallet.address)
            );

            expect(
                await tUSD_metapool_coin.balanceOf(adminWallet.address)
            ).to.eq(0);
            console.log(
                `balance before ${await tUSD_metapool_coin.balanceOf(
                    adminWallet.address
                )}`
            );

            const secBetweenBlocks = 14;
            let blockBefore = await ethers.provider.getBlock();

            await poolHelper.printBalance(
                "stakingRewards",
                stakingRewards.address,
                "tGOV",
                tGOV
            );

            const startTimestamp = (await ethers.provider.getBlock()).timestamp;
            await network.provider.send("hardhat_mine", [
                "0x" + Number(500).toString(16),
                "0x" + Number(secBetweenBlocks).toString(16),
            ]);
            console.log("\nSTART SIMULATE REWARDS");
            console.log("--------------------------");
            const blockSteps = [
                50,
                450,
                4500,
                twoWeeks / secBetweenBlocks + 100,
            ];
            let blockTime;
            let blockNum = 0;
            for (let i = 0; i < blockSteps.length; ++i) {
                await network.provider.send("hardhat_mine", [
                    "0x" + Number(blockSteps[i]).toString(16),
                    "0x" + Number(secBetweenBlocks).toString(16),
                ]);
                blockNum += blockSteps[i];
                blockTime = (await ethers.provider.getBlock()).timestamp;
                console.log(
                    `after ${blockNum} and ${(
                        (blockTime - startTimestamp) /
                        3600 /
                        24
                    ).toFixed(2)} days, Prct rewards earned: ${(
                        ((await stakingRewards.earned(adminWallet.address)) /
                            rewardAmt) *
                        100
                    ).toFixed(6)}%`
                );
            }
            console.log("--------------------------");
            console.log("END SIMULATE REWARDS \n");

            await poolHelper.printBalance(
                "admin",
                adminWallet.address,
                "tGOV",
                tGOV
            );
            await stakingRewards.getReward();
            await poolHelper.printBalance(
                "admin",
                adminWallet.address,
                "tGOV",
                tGOV
            );
            await poolHelper.printBalance(
                "stakingRewards",
                stakingRewards.address,
                "tGOV",
                tGOV
            );
            expect(
                (await tGOV.balanceOf(stakingRewards.address)) / rewardAmt
            ).to.be.at.most(0.00001);

            return;
        });
    });
});
