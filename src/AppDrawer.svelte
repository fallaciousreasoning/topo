<script>
  import Drawer, {
    AppContent,
    Content,
    Header,
    Title,
    Scrim
  } from "@smui/drawer";
  import List, { Item, Text, Separator, Subheader } from "@smui/list";

  import { drawerOpen } from './stores';
</script>

<Drawer style="z-index: 1000" variant="modal" bind:open={$drawerOpen}>
    <Header>
        <Title>Topo Maps</Title>
    </Header>
    <Content>
        <List>
            <Item>
                <Text>Manage Storage</Text>
            </Item>
        </List>
    </Content>
</Drawer>
<Scrim/>
