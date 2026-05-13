import { Center, Group, Image, Text, UnstyledButton } from '@mantine/core';

import PreloadLink from '@components/utils/link';
import classes from './_brand.module.css';

export function Brand() {
  return (
    <Center mr="1rem" miw={{ base: 'auto', sm: '3.5rem' }}>
      <UnstyledButton component={PreloadLink} href="/" className={classes.brandButton}>
        <Group gap="xs" wrap="nowrap">
          <Image
            style={{ width: '92px', marginRight: '0px' }}
            src="/logo-servia.png"
            alt="Servia logo"
          />
        </Group>
      </UnstyledButton>
    </Center>
  );
}

export function BrandFooter() {
  return (
    <Center>
      <Group gap="sm">
        <Image
          mb="0.25rem"
          style={{ width: '32px', marginRight: '0px' }}
          src="/logo-servia.png"
          alt="Servia logo"
        />
        <Text className={classes.brandFooterTitle} lineClamp={1}>
          Servia
        </Text>
      </Group>
    </Center>
  );
}
