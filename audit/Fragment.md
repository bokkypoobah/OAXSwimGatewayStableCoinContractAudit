## Contract Permissions

<br />

<hr />

## Tokens

<br />

<hr />

## Token Limits

<br />

<hr />

## Components

Source code for the component files (first column) were code-reviewed. Flattened versions of the deployed consolidated contracts (columns 3 onwards) were generated to create a listing of contracts for each consolidated flattened contract.

<table>
    <thead>
        <tr>
            <th>Code Review</th>
            <th>Component</th>
            <th><a href="flattened/GateRoles_flattened.sol">GateRoles</a></th>
            <th><a href="flattened/DSGuard_flattened.sol">DSGuard</a></th>
            <th><a href="flattened/AddressStatus_flattened.sol">AddressStatus</a></th>
            <th><a href="flattened/Membership_flattened.sol">Membership</a></th>
            <th><a href="flattened/TransferFeeController_flattened.sol">TransferFeeController</a></th>
            <th><a href="flattened/LimitSetting_flattened.sol">LimitSetting</a></th>
            <th><a href="flattened/TokenRules_flattened.sol">TokenRules</a></th>
            <th><a href="flattened/LimitController_flattened.sol">LimitController</a></th>
            <th><a href="flattened/FiatToken_flattened.sol">FiatToken</a></th>
            <th><a href="flattened/GateWithFee_flattened.sol">GateWithFee</a></th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td rowspan=7><a href="code-review/dappsys.md">dappsys</a></td>
            <td>DSMath</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td>1</td>
            <td></td>
            <td></td>
            <td>1</td>
            <td>1</td>
            <td>1</td>
        </tr>
        <tr>
            <td>ERC20Events, ERC20</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td>2</td>
            <td>2</td>
        </tr>
        <tr>
            <td>DSAuthority, DSAuthEvents, DSAuth</td>
            <td>1</td>
            <td>1</td>
            <td>1</td>
            <td>1</td>
            <td>2</td>
            <td>1</td>
            <td>1</td>
            <td>2</td>
            <td>3</td>
            <td>3</td>
        </tr>
        <tr>
            <td>DSNote, DSStop</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td>2</td>
            <td></td>
            <td>3</td>
            <td>4</td>
            <td>4</td>
        </tr>
        <tr>
            <td>DSGuardEvents, DSGuard</td>
            <td></td>
            <td>2</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>DSRoles</td>
            <td>2</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td>5</td>
        </tr>
        <tr>
            <td>DSTokenBase and DSToken</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td>5</td>
            <td>6</td>
        </tr>
        <tr>
            <td><a href="code-review/solovault.md">solovault</a></td>
            <td>DSSoloVault</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td>7</td>
        </tr>
        <tr>
            <td><a href="code-review/GateRoles.md">GateRoles</a></td>
            <td>GateRoles</td>
            <td>3</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td>8</td>
        </tr>
        <tr>
            <td><a href="code-review/AddressStatus.md">AddressStatus</a></td>
            <td>AddressStatus</td>
            <td></td>
            <td></td>
            <td>2</td>
            <td>2</td>
            <td></td>
            <td></td>
            <td>3</td>
            <td></td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td><a href="code-review/Membership.md">Membership</a></td>
            <td>MembershipInterface,  MockOAXMembership</td>
            <td></td>
            <td></td>
            <td></td>
            <td>3</td>
            <td></td>
            <td></td>
            <td>4</td>
            <td></td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td><a href="code-review/TransferFeeControllerInterface.md">TransferFeeControllerInterface</a></td>
            <td>TransferFeeControllerInterface</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td>3</td>
            <td></td>
            <td></td>
            <td></td>
            <td>7</td>
            <td>10</td>
        </tr>
        <tr>
            <td><a href="code-review/TransferFeeController.md">TransferFeeController</a></td>
            <td>TransferFeeController</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td>4</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td>15</td>
        </tr>
        <tr>
            <td><a href="code-review/LimitSetting.md">LimitSetting</a></td>
            <td>LimitSetting</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td>3</td>
            <td></td>
            <td>4</td>
            <td></td>
            <td>12</td>
        </tr>
        <tr>
            <td><a href="code-review/TokenAuth.md">TokenAuth</a></td>
            <td>ERC20Authority, ERC20Auth, TokenAuthority, TokenAuth</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td>2</td>
            <td></td>
            <td>6</td>
            <td>9</td>
        </tr>
        <tr>
            <td><a href="code-review/TokenRules.md">TokenRules</a></td>
            <td>BaseRule, BoundaryKycRule, FullKycRule</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td>5</td>
            <td></td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td><a href="code-review/LimitController.md">LimitController</a></td>
            <td>LimitController</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td>5</td>
            <td></td>
            <td>13</td>
        </tr>
        <tr>
            <td><a href="code-review/FiatToken.md">FiatToken</a></td>
            <td>FiatToken</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td>8</td>
            <td>11</td>
        </tr>
        <tr>
            <td><a href="code-review/Gate.md">Gate</a></td>
            <td>Gate</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td>14</td>
        </tr>
        <tr>
            <td><a href="code-review/GateWithFee.md">GateWithFee</a></td>
            <td>GateWithFee</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td>16</td>
        </tr>
    </tbody>
</table>
