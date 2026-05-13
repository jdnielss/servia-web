import { Container, Text } from '@mantine/core';
import classes from './footer.module.css';

export function DashboardFooter() {
  return (
    <>
      <div className={classes.spacer} />
      <div className={classes.footer}>
        <Container className={classes.inner}>
          <Text className={classes.footerText}>Servia by Casa Familia</Text>
        </Container>
      </div>
    </>
  );
}
